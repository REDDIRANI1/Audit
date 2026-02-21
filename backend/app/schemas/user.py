from pydantic import BaseModel
from typing import Optional, List, Any


class DashboardMetric(BaseModel):
    label: str
    value: Any
    change: Optional[float] = None  # percentage change
    trend: Optional[str] = None  # "up", "down", "flat"


class DashboardResponse(BaseModel):
    user_id: int
    role: str
    metrics: List[DashboardMetric]
    recent_calls: Optional[List[dict]] = None
    alerts: Optional[List[dict]] = None
