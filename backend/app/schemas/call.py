from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class CallResponse(BaseModel):
    id: int
    user_id: int
    template_id: int
    batch_id: Optional[str] = None
    s3_path: str
    status: str
    duration_seconds: Optional[int] = None
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CallResultResponse(BaseModel):
    call_id: int
    status: str
    overall_score: Optional[float] = None
    summary: Optional[str] = None
    compliance_flags: Optional[dict] = None
    pillar_scores: Optional[dict] = None
    recommendations: Optional[list] = None
    transcript: Optional[List[dict]] = None


class CallListResponse(BaseModel):
    calls: List[CallResponse]
    total: int
    page: int
    per_page: int


class UploadResponse(BaseModel):
    call_id: int
    status: str = "queued"
    message: str = "Call queued for processing"


class BulkUploadResponse(BaseModel):
    batch_id: str
    call_ids: List[int]
    total_files: int
    status: str = "queued"
