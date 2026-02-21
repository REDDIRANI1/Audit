from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.middleware.auth import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.call import Call
from app.models.transcript import Transcript
from app.models.evaluation import EvaluationResult
from app.schemas.call import CallResponse, CallResultResponse, CallListResponse

router = APIRouter(prefix="/api/calls", tags=["Calls"])


@router.get("", response_model=CallListResponse)
async def list_calls(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_filter: str = Query(None, alias="status"),
    batch_id: str = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List calls visible to the current user (RBAC enforced)."""
    query = select(Call)

    # RBAC: Agents see own calls, Managers see team, Admin/CXO see all
    if current_user.role == UserRole.AGENT:
        query = query.where(Call.user_id == current_user.id)
    elif current_user.role == UserRole.MANAGER:
        # Manager sees their team (same department)
        team_query = select(User.id).where(User.department == current_user.department)
        query = query.where(Call.user_id.in_(team_query))
    # Admin and CXO see all calls

    if status_filter:
        query = query.where(Call.status == status_filter)

    if batch_id:
        query = query.where(Call.batch_id == batch_id)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    query = query.order_by(Call.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    calls = result.scalars().all()

    return CallListResponse(
        calls=[CallResponse.model_validate(c) for c in calls],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/{call_id}", response_model=CallResponse)
async def get_call(
    call_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific call's status and metadata."""
    result = await db.execute(select(Call).where(Call.id == call_id))
    call = result.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    # RBAC check
    if current_user.role == UserRole.AGENT and call.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this call")

    return CallResponse.model_validate(call)


@router.get("/{call_id}/results", response_model=CallResultResponse)
async def get_call_results(
    call_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the scored results and transcript for a completed call."""
    result = await db.execute(select(Call).where(Call.id == call_id))
    call = result.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    # RBAC check
    if current_user.role == UserRole.AGENT and call.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this call")

    # Get evaluation
    eval_result = await db.execute(
        select(EvaluationResult).where(EvaluationResult.call_id == call_id)
    )
    evaluation = eval_result.scalar_one_or_none()

    # Get transcript segments
    transcript_result = await db.execute(
        select(Transcript)
        .where(Transcript.call_id == call_id)
        .order_by(Transcript.start_time)
    )
    transcripts = transcript_result.scalars().all()
    transcript_data = [
        {
            "speaker": t.speaker_label,
            "start": t.start_time,
            "end": t.end_time,
            "text": t.text,
        }
        for t in transcripts
    ]

    full_json = evaluation.full_json_output or {} if evaluation else {}

    return CallResultResponse(
        call_id=call_id,
        status=call.status.value if hasattr(call.status, 'value') else call.status,
        overall_score=evaluation.overall_score if evaluation else None,
        score_label=full_json.get("score_label"),
        score_name=full_json.get("score_name"),
        fatal_flaw=full_json.get("fatal_flaw", False),
        summary=evaluation.summary if evaluation else None,
        compliance_flags=evaluation.compliance_flags if evaluation else None,
        pillar_scores=evaluation.pillar_scores if evaluation else None,
        pillar_breakdown=full_json.get("pillar_breakdown"),
        recommendations=evaluation.recommendations if evaluation else None,
        transcript=transcript_data if transcripts else None,
    )

