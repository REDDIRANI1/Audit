"""
Analytics API – aggregated metrics for charts and dashboards.

Endpoints:
    GET /api/analytics/overview          – top-level KPIs
    GET /api/analytics/score-trend       – daily avg score over time
    GET /api/analytics/score-distribution – score bucket counts
    GET /api/analytics/pillar-breakdown  – avg per pillar across all calls
    GET /api/analytics/agent-leaderboard – ranked agent performance
    GET /api/analytics/call-volume       – daily call volume over time
"""
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, case, cast, Float, Integer
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.call import Call
from app.models.evaluation import EvaluationResult
from app.models.user import User

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


# ─────────────────────────────────────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────────────────────────────────────

def _days_ago(n: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=n)


# ─────────────────────────────────────────────────────────────────────────────
# Overview KPIs
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/overview")
async def get_overview(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Top-level KPIs for the selected time window."""
    from sqlalchemy import select

    since = _days_ago(days)

    result = await db.execute(
        select(
            func.count(Call.id).label("total_calls"),
            func.count(case((Call.status == "completed", 1))).label("completed"),
            func.count(case((Call.status == "failed", 1))).label("failed"),
            func.count(case((Call.status == "processing", 1))).label("processing"),
        ).where(Call.created_at >= since)
    )
    call_stats = result.first()

    score_result = await db.execute(
        select(
            func.avg(EvaluationResult.overall_score).label("avg_score"),
            func.min(EvaluationResult.overall_score).label("min_score"),
            func.max(EvaluationResult.overall_score).label("max_score"),
            func.count(case((EvaluationResult.overall_score >= 80, 1))).label("excellent"),
            func.count(case((EvaluationResult.overall_score < 60, 1))).label("at_risk"),
        ).join(Call, Call.id == EvaluationResult.call_id)
        .where(Call.created_at >= since)
    )
    score_stats = score_result.first()

    total = call_stats.total_calls or 1  # avoid div-by-zero
    return {
        "total_calls": call_stats.total_calls,
        "completed": call_stats.completed,
        "failed": call_stats.failed,
        "processing": call_stats.processing,
        "success_rate": round((call_stats.completed / total) * 100, 1),
        "avg_score": round(float(score_stats.avg_score or 0), 1),
        "min_score": round(float(score_stats.min_score or 0), 1),
        "max_score": round(float(score_stats.max_score or 0), 1),
        "excellent_count": score_stats.excellent,
        "at_risk_count": score_stats.at_risk,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Score Trend (line chart)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/score-trend")
async def get_score_trend(
    days: int = Query(30, ge=7, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Daily average score over the past N days."""
    from sqlalchemy import select, text

    since = _days_ago(days)

    result = await db.execute(
        select(
            func.date_trunc("day", Call.created_at).label("day"),
            func.avg(EvaluationResult.overall_score).label("avg_score"),
            func.count(Call.id).label("call_count"),
        )
        .join(EvaluationResult, EvaluationResult.call_id == Call.id)
        .where(Call.created_at >= since)
        .group_by(func.date_trunc("day", Call.created_at))
        .order_by(func.date_trunc("day", Call.created_at))
    )
    rows = result.all()

    return [
        {
            "date": row.day.strftime("%Y-%m-%d"),
            "avg_score": round(float(row.avg_score), 1),
            "call_count": row.call_count,
        }
        for row in rows
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Score Distribution (bar chart)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/score-distribution")
async def get_score_distribution(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Count of calls in each score bucket (0-20, 20-40, …, 80-100)."""
    from sqlalchemy import select

    since = _days_ago(days)

    buckets = [
        ("0–20", 0, 20),
        ("20–40", 20, 40),
        ("40–60", 40, 60),
        ("60–80", 60, 80),
        ("80–100", 80, 101),
    ]

    data = []
    for label, lo, hi in buckets:
        result = await db.execute(
            select(func.count(EvaluationResult.id))
            .join(Call, Call.id == EvaluationResult.call_id)
            .where(
                Call.created_at >= since,
                EvaluationResult.overall_score >= lo,
                EvaluationResult.overall_score < hi,
            )
        )
        count = result.scalar() or 0
        data.append({"range": label, "count": count})

    return data


# ─────────────────────────────────────────────────────────────────────────────
# Call Volume (bar chart)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/call-volume")
async def get_call_volume(
    days: int = Query(30, ge=7, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Daily call volume over the past N days."""
    from sqlalchemy import select

    since = _days_ago(days)

    result = await db.execute(
        select(
            func.date_trunc("day", Call.created_at).label("day"),
            func.count(Call.id).label("total"),
            func.count(case((Call.status == "completed", 1))).label("completed"),
            func.count(case((Call.status == "failed", 1))).label("failed"),
        )
        .where(Call.created_at >= since)
        .group_by(func.date_trunc("day", Call.created_at))
        .order_by(func.date_trunc("day", Call.created_at))
    )
    rows = result.all()

    return [
        {
            "date": row.day.strftime("%Y-%m-%d"),
            "total": row.total,
            "completed": row.completed,
            "failed": row.failed,
        }
        for row in rows
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Agent Leaderboard
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/agent-leaderboard")
async def get_agent_leaderboard(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Top agents ranked by average score."""
    from sqlalchemy import select

    since = _days_ago(days)

    result = await db.execute(
        select(
            User.id,
            User.full_name,
            User.email,
            func.count(Call.id).label("call_count"),
            func.avg(EvaluationResult.overall_score).label("avg_score"),
            func.min(EvaluationResult.overall_score).label("min_score"),
            func.max(EvaluationResult.overall_score).label("max_score"),
        )
        .join(Call, Call.user_id == User.id)
        .join(EvaluationResult, EvaluationResult.call_id == Call.id)
        .where(Call.created_at >= since, Call.status == "completed")
        .group_by(User.id, User.full_name, User.email)
        .order_by(func.avg(EvaluationResult.overall_score).desc())
        .limit(limit)
    )
    rows = result.all()

    return [
        {
            "rank": i + 1,
            "user_id": row.id,
            "name": row.full_name or row.email.split("@")[0],
            "email": row.email,
            "call_count": row.call_count,
            "avg_score": round(float(row.avg_score), 1),
            "min_score": round(float(row.min_score), 1),
            "max_score": round(float(row.max_score), 1),
        }
        for i, row in enumerate(rows)
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Processing Jobs (pipeline status for a specific call)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/pipeline-status/{call_id}")
async def get_pipeline_status(
    call_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the current pipeline stage statuses for a call."""
    from sqlalchemy import select
    from app.models.processing_job import ProcessingJob

    result = await db.execute(
        select(ProcessingJob)
        .where(ProcessingJob.call_id == call_id)
        .order_by(ProcessingJob.created_at)
    )
    jobs = result.scalars().all()

    # Get the call status too
    call_result = await db.execute(
        select(Call.status, Call.error_message).where(Call.id == call_id)
    )
    call = call_result.first()

    return {
        "call_id": call_id,
        "call_status": call.status if call else "unknown",
        "error_message": call.error_message if call else None,
        "stages": [
            {
                "stage": j.stage,
                "status": j.status,
                "started_at": j.started_at.isoformat() if j.started_at else None,
                "finished_at": j.finished_at.isoformat() if j.finished_at else None,
                "error_message": j.error_message,
            }
            for j in jobs
        ],
    }
