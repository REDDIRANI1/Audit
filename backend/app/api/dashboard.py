from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User, UserRole
from app.models.call import Call, CallStatus
from app.models.evaluation import EvaluationResult
from app.schemas.user import DashboardResponse, DashboardMetric

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get role-based dashboard metrics for the current user."""
    metrics = []
    recent_calls = []
    alerts = []

    if current_user.role == UserRole.agent:
        metrics, recent_calls, alerts = await _agent_dashboard(db, current_user)
    elif current_user.role == UserRole.manager:
        metrics, recent_calls, alerts = await _manager_dashboard(db, current_user)
    else:  # CXO / Admin
        metrics, recent_calls, alerts = await _executive_dashboard(db, current_user)

    return DashboardResponse(
        user_id=current_user.id,
        role=current_user.role.value,
        metrics=metrics,
        recent_calls=recent_calls,
        alerts=alerts,
    )


async def _agent_dashboard(db: AsyncSession, user: User):
    """Agent micro-view: individual performance."""
    # Total calls
    total_result = await db.execute(
        select(func.count()).select_from(Call).where(Call.user_id == user.id)
    )
    total_calls = total_result.scalar() or 0

    # Completed calls
    completed_result = await db.execute(
        select(func.count()).select_from(Call)
        .where(Call.user_id == user.id, Call.status == CallStatus.COMPLETED)
    )
    completed = completed_result.scalar() or 0

    # Average score
    avg_result = await db.execute(
        select(func.avg(EvaluationResult.overall_score))
        .join(Call, EvaluationResult.call_id == Call.id)
        .where(Call.user_id == user.id)
    )
    avg_score = avg_result.scalar()

    # Processing calls
    processing_result = await db.execute(
        select(func.count()).select_from(Call)
        .where(Call.user_id == user.id, Call.status == CallStatus.PROCESSING)
    )
    processing = processing_result.scalar() or 0

    metrics = [
        DashboardMetric(label="Total Calls", value=total_calls),
        DashboardMetric(label="Completed", value=completed),
        DashboardMetric(label="Average Score", value=round(avg_score, 1) if avg_score else 0),
        DashboardMetric(label="Processing", value=processing),
    ]

    # Recent calls
    recent_result = await db.execute(
        select(Call)
        .where(Call.user_id == user.id)
        .order_by(Call.created_at.desc())
        .limit(5)
    )
    recent = recent_result.scalars().all()
    recent_calls = [
        {"id": c.id, "status": c.status.value if hasattr(c.status, 'value') else c.status, "created_at": str(c.created_at)}
        for c in recent
    ]

    alerts = []
    if avg_score and avg_score < 70:
        alerts.append({"type": "warning", "message": "Your average score is below 70. Review coaching hints."})

    return metrics, recent_calls, alerts


async def _manager_dashboard(db: AsyncSession, user: User):
    """Manager team-view: aggregate team data."""
    team_query = select(User.id).where(User.department == user.department)

    # Team total calls
    total_result = await db.execute(
        select(func.count()).select_from(Call).where(Call.user_id.in_(team_query))
    )
    total_calls = total_result.scalar() or 0

    # Team average score
    avg_result = await db.execute(
        select(func.avg(EvaluationResult.overall_score))
        .join(Call, EvaluationResult.call_id == Call.id)
        .where(Call.user_id.in_(team_query))
    )
    avg_score = avg_result.scalar()

    # Team members count
    member_result = await db.execute(
        select(func.count()).select_from(User).where(User.department == user.department)
    )
    team_size = member_result.scalar() or 0

    # Failed calls
    failed_result = await db.execute(
        select(func.count()).select_from(Call)
        .where(Call.user_id.in_(team_query), Call.status == CallStatus.FAILED)
    )
    failed = failed_result.scalar() or 0

    metrics = [
        DashboardMetric(label="Team Calls", value=total_calls),
        DashboardMetric(label="Team Avg Score", value=round(avg_score, 1) if avg_score else 0),
        DashboardMetric(label="Team Size", value=team_size),
        DashboardMetric(label="Failed Calls", value=failed),
    ]

    alerts = []
    if avg_score and avg_score < 75:
        alerts.append({"type": "warning", "message": "Team average below 75. Consider targeted coaching."})

    return metrics, [], alerts


async def _executive_dashboard(db: AsyncSession, user: User):
    """CXO/Admin macro-view: company-wide trends."""
    # Total calls company-wide
    total_result = await db.execute(
        select(func.count()).select_from(Call)
    )
    total = total_result.scalar() or 0

    # Company average score
    avg_result = await db.execute(
        select(func.avg(EvaluationResult.overall_score))
    )
    avg_score = avg_result.scalar()

    # Completed rate
    completed_result = await db.execute(
        select(func.count()).select_from(Call).where(Call.status == CallStatus.COMPLETED)
    )
    completed = completed_result.scalar() or 0

    # Total users
    user_result = await db.execute(
        select(func.count()).select_from(User).where(User.is_active == 1)
    )
    total_users = user_result.scalar() or 0

    completion_rate = round((completed / total * 100), 1) if total > 0 else 0

    metrics = [
        DashboardMetric(label="Total Calls", value=total),
        DashboardMetric(label="Avg Quality Score", value=round(avg_score, 1) if avg_score else 0),
        DashboardMetric(label="Completion Rate", value=f"{completion_rate}%"),
        DashboardMetric(label="Active Users", value=total_users),
    ]

    alerts = []
    return metrics, [], alerts
