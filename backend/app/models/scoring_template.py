from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ScoringTemplate(Base):
    __tablename__ = "scoring_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    vertical = Column(String(50), nullable=False, default="Sales")  # Sales, Support, Collections
    system_prompt = Column(Text, nullable=False)
    json_schema = Column(JSONB, nullable=False)
    version = Column(Integer, default=1)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    calls = relationship("Call", back_populates="template")
