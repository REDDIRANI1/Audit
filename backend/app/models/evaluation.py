from sqlalchemy import Column, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class EvaluationResult(Base):
    __tablename__ = "evaluation_results"

    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.id"), unique=True, nullable=False, index=True)
    overall_score = Column(Float, nullable=True)
    summary = Column(Text, nullable=True)
    compliance_flags = Column(JSONB, nullable=True, default={})
    pillar_scores = Column(JSONB, nullable=True, default={})  # {"CQS": 85, "ECS": 72, ...}
    recommendations = Column(JSONB, nullable=True, default=[])
    full_json_output = Column(JSONB, nullable=True, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    call = relationship("Call", back_populates="evaluation")
