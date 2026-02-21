"""
Enhanced authentication API with MFA / TOTP support.

Endpoints:
    POST /api/auth/login            – password check; returns full JWT or mfa_required flag
    POST /api/auth/register         – create account
    POST /api/auth/mfa/verify       – supply TOTP code to complete MFA login
    POST /api/auth/mfa/enroll       – generate TOTP secret + QR URI (requires auth)
    POST /api/auth/mfa/activate     – confirm code is valid → enable MFA
    POST /api/auth/mfa/disable      – verify current TOTP → disable MFA
"""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.config import settings
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    MfaVerifyRequest,
    MfaEnrollResponse,
    MfaActivateRequest,
    MfaDisableRequest,
)
from app.services.auth_service import (
    authenticate_user,
    create_user,
    generate_user_token,
    get_user_by_email,
    get_user_by_id,
)
from app.services.mfa_service import (
    generate_totp_secret,
    encrypt_totp_secret,
    decrypt_totp_secret,
    get_totp_provisioning_uri,
    verify_totp_code,
    verify_totp_with_encrypted_secret,
)
from app.services.audit_service import log_action
from app.utils.security import create_access_token, decode_access_token
from app.models.user import UserRole
from app.middleware.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        department=user.department,
        is_active=user.is_active,
        mfa_enabled=user.mfa_enabled,
    )


def _create_temp_token(user_id: int) -> str:
    """Short-lived JWT scoped only to MFA verification."""
    return create_access_token(
        data={"sub": str(user_id), "scope": "mfa_pending"},
        expires_delta=timedelta(minutes=settings.MFA_TEMP_TOKEN_MINUTES),
    )


def _decode_temp_token(temp_token: str) -> int:
    """Decode the MFA temp token; raises HTTPException if invalid/expired."""
    payload = decode_access_token(temp_token)
    if not payload or payload.get("scope") != "mfa_pending":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired MFA session",
        )
    return int(payload["sub"])


# ─────────────────────────────────────────────────────────────────────────────
# Login
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/login")
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Password-based login. Returns JWT directly, or an MFA challenge token."""
    user = await authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    await log_action(
        db,
        user_id=user.id,
        action_type="login",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    if user.mfa_enabled:
        # Return a short-lived temp token; frontend must then POST /mfa/verify
        return LoginResponse(
            mfa_required=True,
            temp_token=_create_temp_token(user.id),
        )

    # MFA not enabled → normal JWT
    return TokenResponse(
        access_token=generate_user_token(user),
        user=_user_response(user),
        mfa_enabled=False,
    )


# ─────────────────────────────────────────────────────────────────────────────
# MFA Verify (complete login)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/mfa/verify", response_model=TokenResponse)
async def mfa_verify(
    body: MfaVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """Submit TOTP code to complete an MFA-pending login."""
    user_id = _decode_temp_token(body.temp_token)
    user = await get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if not user.mfa_enabled or not user.totp_secret_enc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MFA not configured")

    if not verify_totp_with_encrypted_secret(user.totp_secret_enc, body.code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid TOTP code",
        )

    return TokenResponse(
        access_token=generate_user_token(user),
        user=_user_response(user),
        mfa_enabled=True,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Register
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user account."""
    existing = await get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    try:
        role = UserRole(body.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {body.role}. Must be one of: Agent, Manager, CXO, Admin",
        )

    user = await create_user(
        db,
        email=body.email,
        password=body.password,
        full_name=body.full_name,
        role=role,
        department=body.department,
    )

    return TokenResponse(
        access_token=generate_user_token(user),
        user=_user_response(user),
    )


# ─────────────────────────────────────────────────────────────────────────────
# MFA Enroll (generate secret + QR)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/mfa/enroll", response_model=MfaEnrollResponse)
async def mfa_enroll(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a new TOTP secret for the current user.
    Returns the plaintext secret (shown once) and an otpauth:// URI for QR display.
    The secret is NOT yet saved — call /mfa/activate to confirm and save.
    """
    secret = generate_totp_secret()
    uri = get_totp_provisioning_uri(current_user.email, secret)

    # Store the *pending* secret (not yet activated) temporarily encrypted
    current_user.totp_secret_enc = encrypt_totp_secret(secret)
    db.add(current_user)
    await db.flush()

    return MfaEnrollResponse(secret=secret, provisioning_uri=uri)


# ─────────────────────────────────────────────────────────────────────────────
# MFA Activate (confirm + enable)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/mfa/activate")
async def mfa_activate(
    body: MfaActivateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verify the TOTP code against the enrolled secret and enable MFA."""
    if not current_user.totp_secret_enc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Call /mfa/enroll first to generate a secret",
        )
    if not verify_totp_with_encrypted_secret(current_user.totp_secret_enc, body.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid TOTP code — check your authenticator app",
        )

    current_user.mfa_enabled = True
    db.add(current_user)
    await db.flush()

    return {"detail": "MFA enabled successfully"}


# ─────────────────────────────────────────────────────────────────────────────
# MFA Disable
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/mfa/disable")
async def mfa_disable(
    body: MfaDisableRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Disable MFA after verifying the current TOTP code."""
    if not current_user.mfa_enabled or not current_user.totp_secret_enc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MFA is not enabled")

    if not verify_totp_with_encrypted_secret(current_user.totp_secret_enc, body.code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid TOTP code",
        )

    current_user.mfa_enabled = False
    current_user.totp_secret_enc = None
    db.add(current_user)
    await db.flush()

    return {"detail": "MFA disabled"}


# ─────────────────────────────────────────────────────────────────────────────
# MFA Status
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/mfa/status")
async def mfa_status(
    current_user: User = Depends(get_current_user),
):
    """Return the current user's MFA enrollment status."""
    return {
        "mfa_enabled": current_user.mfa_enabled,
        "enrolled": current_user.totp_secret_enc is not None,
    }
