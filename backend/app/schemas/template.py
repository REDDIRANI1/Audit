from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class TemplateCreate(BaseModel):
    name: str
    vertical: str = "Sales"  # Sales, Support, Collections
    system_prompt: str
    json_schema: dict


class TemplateResponse(BaseModel):
    id: int
    name: str
    vertical: str
    system_prompt: str
    json_schema: Any
    version: int
    is_active: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TemplateListResponse(BaseModel):
    templates: list[TemplateResponse]
    total: int
