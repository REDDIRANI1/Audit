import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class UserRole(str, enum.Enum):
    agent = "agent"
    manager = "manager"
    cxo = "cxo"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole, name="userrole"), nullable=False, default=UserRole.agent)
    department = Column(String(100), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # MFA / TOTP fields
    totp_secret_enc = Column(String(512), nullable=True)
    mfa_enabled = Column(Boolean, default=False, nullable=False)

    # Relationships
    calls = relationship("Call", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")
    client = relationship("Client", back_populates="users")

