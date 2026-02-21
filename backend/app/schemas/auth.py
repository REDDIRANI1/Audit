from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "Agent"
    department: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"
    mfa_enabled: bool = False


class LoginResponse(BaseModel):
    """Returned when password is correct but MFA is still required."""
    mfa_required: bool = True
    temp_token: str          # short-lived token scoped to MFA verification only


class MfaVerifyRequest(BaseModel):
    temp_token: str
    code: str                # 6-digit TOTP code


class MfaEnrollResponse(BaseModel):
    secret: str              # plaintext base32 (shown once for manual entry)
    provisioning_uri: str    # otpauth:// URI for QR code


class MfaActivateRequest(BaseModel):
    code: str                # user confirms they can generate a valid code


class MfaDisableRequest(BaseModel):
    code: str                # requires current TOTP code to disable


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    department: Optional[str] = None
    is_active: int
    mfa_enabled: bool = False

    class Config:
        from_attributes = True


TokenResponse.model_rebuild()
