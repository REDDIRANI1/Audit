"""
Database Persistence for Pipeline Results.

All functions use synchronous SQLAlchemy sessions (Celery workers
cannot use asyncio/asyncpg).
"""
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from workers.pipeline.db_session import get_sync_db

logger = logging.getLogger(__name__)


def update_call_status(
    call_id: int,
    status: str,
    error_message: Optional[str] = None,
    duration_seconds: Optional[float] = None,
) -> None:
    """Update a Call row's status (and optionally duration/error)."""
    from app.models.call import Call

    with get_sync_db() as db:
        call = db.query(Call).filter(Call.id == call_id).first()
        if not call:
            logger.error(f"[DB] Call {call_id} not found")
            return

        call.status = status
        if error_message is not None:
            call.error_message = error_message[:1000]
        if duration_seconds is not None:
            call.duration_seconds = int(duration_seconds)
        if status in ("completed", "failed"):
            call.processed_at = datetime.now(timezone.utc)

    logger.info(f"[DB] Call {call_id} status → {status}")


def record_processing_job(
    call_id: int,
    stage: str,
    status: str,
    error_message: Optional[str] = None,
) -> None:
    """Upsert a ProcessingJob row for a pipeline stage."""
    from app.models.processing_job import ProcessingJob, PipelineStage, JobStatus

    with get_sync_db() as db:
        job = (
            db.query(ProcessingJob)
            .filter(ProcessingJob.call_id == call_id)
            .filter(ProcessingJob.stage == stage)
            .first()
        )

        now = datetime.now(timezone.utc)

        if job:
            job.status = status
            if status == "running":
                job.started_at = now
            elif status in ("completed", "failed"):
                job.finished_at = now
            if error_message:
                job.error_message = error_message[:1000]
        else:
            job = ProcessingJob(
                call_id=call_id,
                stage=stage,
                status=status,
                started_at=now if status == "running" else None,
                finished_at=now if status in ("completed", "failed") else None,
                error_message=error_message[:1000] if error_message else None,
            )
            db.add(job)

    logger.debug(f"[DB] ProcessingJob call={call_id} stage={stage} → {status}")


def save_transcript(call_id: int, segments: List[Dict]) -> None:
    """
    Save ASR transcript segments to the transcripts table.
    Deletes any existing segments for this call first (idempotent).
    """
    from app.models.transcript import Transcript

    with get_sync_db() as db:
        # Delete existing segments
        db.query(Transcript).filter(Transcript.call_id == call_id).delete()

        for seg in segments:
            t = Transcript(
                call_id=call_id,
                speaker=seg.get("speaker", "Unknown"),
                start_time=seg.get("start", 0.0),
                end_time=seg.get("end", 0.0),
                text=seg.get("text", ""),
            )
            db.add(t)

    logger.info(f"[DB] Saved {len(segments)} transcript segments for call {call_id}")


def save_evaluation(call_id: int, scores: Dict[str, Any]) -> None:
    """
    Upsert evaluation results for a call.
    """
    from app.models.evaluation import EvaluationResult

    with get_sync_db() as db:
        existing = (
            db.query(EvaluationResult)
            .filter(EvaluationResult.call_id == call_id)
            .first()
        )

        if existing:
            ev = existing
        else:
            ev = EvaluationResult(call_id=call_id)
            db.add(ev)

        ev.overall_score = float(scores.get("overall_score", 0))
        ev.summary = str(scores.get("summary", ""))
        ev.compliance_flags = scores.get("compliance_flags", {})
        ev.pillar_scores = scores.get("pillar_scores", {})
        ev.recommendations = scores.get("recommendations", [])
        ev.full_json_output = scores.get("raw_output", scores)

    logger.info(f"[DB] Saved evaluation for call {call_id} (score={scores.get('overall_score')})")


def get_template(template_id: int) -> Optional[Dict]:
    """Fetch a ScoringTemplate by ID and return as dict."""
    from app.models.scoring_template import ScoringTemplate

    with get_sync_db() as db:
        t = db.query(ScoringTemplate).filter(ScoringTemplate.id == template_id).first()
        if not t:
            return None
        return {
            "id": t.id,
            "name": t.name,
            "system_prompt": t.system_prompt,
            "json_schema": t.json_schema or {},
        }
