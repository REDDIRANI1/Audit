from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
from app.config import settings


# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


# JWT tokens
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None


# Fernet encryption for sensitive fields (TOTP secrets, etc.)
# Key is loaded from settings so it survives process restarts.
def _get_fernet() -> Fernet:
    key = settings.FERNET_KEY
    # Accept raw base64 key or generate a placeholder-safe fallback for dev
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except Exception:
        # Dev fallback — log warning in real usage
        import warnings
        warnings.warn("FERNET_KEY is invalid; using ephemeral key (dev only)")
        return Fernet(Fernet.generate_key())


def encrypt_field(value: str) -> str:
    """Encrypt a sensitive field value using Fernet."""
    return _get_fernet().encrypt(value.encode()).decode()


def decrypt_field(encrypted_value: str) -> str:
    """Decrypt a Fernet-encrypted field value."""
    return _get_fernet().decrypt(encrypted_value.encode()).decode()

