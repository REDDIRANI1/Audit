from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://auditai:auditai_secret@localhost:5432/auditai"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # MinIO / S3
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin123"
    S3_BUCKET: str = "audit-recordings"

    # JWT
    JWT_SECRET: str = "change-me-to-a-secure-random-string"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440  # 24 hours
    MFA_TEMP_TOKEN_MINUTES: int = 5    # short-lived token while MFA pending

    # Fernet symmetric encryption (for TOTP secrets and other sensitive fields)
    # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    FERNET_KEY: str = "REPLACE_ME_WITH_FERNET_KEY_SEE_ABOVE"

    # Upload limits
    UPLOAD_MAX_SIZE_MB: int = 500
    ALLOWED_EXTENSIONS: str = "wav,mp3,zip"

    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:3000"

    @property
    def allowed_extensions_list(self) -> list[str]:
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",")]

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()

