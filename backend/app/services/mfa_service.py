"""
MFA / TOTP service for Audit AI.

Uses pyotp for TOTP generation/verification.
TOTP secrets are encrypted with Fernet before storage.
"""
import base64
import pyotp
from app.utils.security import encrypt_field, decrypt_field


TOTP_ISSUER = "Audit AI"
TOTP_INTERVAL = 30  # seconds


# ─────────────────────────────────────────────────────────────────────────────
# Secret management
# ─────────────────────────────────────────────────────────────────────────────

def generate_totp_secret() -> str:
    """Generate a new random base32 TOTP secret."""
    return pyotp.random_base32()


def encrypt_totp_secret(secret: str) -> str:
    """Encrypt a TOTP secret for safe DB storage."""
    return encrypt_field(secret)


def decrypt_totp_secret(encrypted: str) -> str:
    """Decrypt a stored TOTP secret."""
    return decrypt_field(encrypted)


# ─────────────────────────────────────────────────────────────────────────────
# QR / provisioning URI
# ─────────────────────────────────────────────────────────────────────────────

def get_totp_provisioning_uri(email: str, secret: str) -> str:
    """
    Return the otpauth:// URI that authenticator apps (Google Auth,
    Authy, etc.) scan as a QR code.
    """
    totp = pyotp.TOTP(secret, interval=TOTP_INTERVAL)
    return totp.provisioning_uri(name=email, issuer_name=TOTP_ISSUER)


# ─────────────────────────────────────────────────────────────────────────────
# Verification
# ─────────────────────────────────────────────────────────────────────────────

def verify_totp_code(secret: str, code: str) -> bool:
    """
    Verify a 6-digit TOTP code against a plaintext secret.
    Allows a ±1 window (30s drift tolerance).
    """
    totp = pyotp.TOTP(secret, interval=TOTP_INTERVAL)
    return totp.verify(code, valid_window=1)


def verify_totp_with_encrypted_secret(encrypted_secret: str, code: str) -> bool:
    """Convenience helper: decrypt then verify."""
    try:
        secret = decrypt_totp_secret(encrypted_secret)
        return verify_totp_code(secret, code)
    except Exception:
        return False
