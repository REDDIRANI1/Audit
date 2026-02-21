import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base


class CallStatus(str, enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Call(Base):
    __tablename__ = "calls"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    template_id = Column(Integer, ForeignKey("scoring_templates.id"), nullable=False)
    batch_id = Column(UUID(as_uuid=True), nullable=True, default=None, index=True)
    s3_path = Column(String(500), nullable=False)
    status = Column(Enum(CallStatus), nullable=False, default=CallStatus.QUEUED)
    duration_seconds = Column(Integer, nullable=True)
    error_message = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="calls")
    template = relationship("ScoringTemplate", back_populates="calls")
    transcripts = relationship("Transcript", back_populates="call", cascade="all, delete-orphan")
    evaluation = relationship("EvaluationResult", back_populates="call", uselist=False, cascade="all, delete-orphan")
    media_files = relationship("MediaFile", back_populates="call", cascade="all, delete-orphan")
    processing_jobs = relationship("ProcessingJob", back_populates="call", cascade="all, delete-orphan")
