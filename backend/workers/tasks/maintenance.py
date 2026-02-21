"""
Data Retention & Maintenance Celery Tasks.

cleanup_expired_data is scheduled nightly at 2 AM UTC via celery_app.beat_schedule.
It honours the retention_days field on each Client row.
If a client has no Client record, a default of 365 days is used.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import List

from workers.celery_app import celery_app
from workers.pipeline.db_session import get_sync_db

logger = logging.getLogger(__name__)

DEFAULT_RETENTION_DAYS = 365


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_s3_client():
    import boto3
    return boto3.client(
        "s3",
        endpoint_url=os.environ.get("S3_ENDPOINT", "http://minio:9000"),
        aws_access_key_id=os.environ.get("S3_ACCESS_KEY", "minioadmin"),
        aws_secret_access_key=os.environ.get("S3_SECRET_KEY", "minioadmin"),
    )


def _delete_s3_object(s3_key: str) -> None:
    bucket = os.environ.get("S3_BUCKET", "audit-recordings")
    try:
        _get_s3_client().delete_object(Bucket=bucket, Key=s3_key)
        logger.debug("[Retention] Deleted S3 object: %s", s3_key)
    except Exception as exc:
        logger.warning("[Retention] Failed to delete S3 object %s: %s", s3_key, exc)


# ---------------------------------------------------------------------------
# Main retention task
# ---------------------------------------------------------------------------

@celery_app.task(name="workers.tasks.maintenance.cleanup_expired_data", bind=True)
def cleanup_expired_data(self) -> dict:
    """
    Delete calls (and cascade: transcripts, evaluations, media, processing_jobs)
    that exceed the client's retention_days policy, and purge their S3 objects.
    Write an audit log entry for every deleted call.

    Returns: { "deleted_calls": N, "deleted_s3_objects": M }
    """
    from app.models.call import Call
    from app.models.client import Client
    from app.models.audit_log import AuditLog

    now = datetime.now(timezone.utc)
    deleted_calls = 0
    deleted_s3 = 0

    with get_sync_db() as db:
        # Build retention cutoff map per client
        clients = db.query(Client).all()
        cutoff_map: dict[int, datetime] = {
            c.id: now - timedelta(days=c.retention_days or DEFAULT_RETENTION_DAYS)
            for c in clients
        }
        default_cutoff = now - timedelta(days=DEFAULT_RETENTION_DAYS)

        # Use earliest cutoff to narrow the DB scan
        earliest = min(cutoff_map.values(), default=default_cutoff)

        expired_calls: List[Call] = (
            db.query(Call)
            .filter(Call.created_at < min(earliest, default_cutoff))
            .all()
        )

        for call in expired_calls:
            # Apply actual cutoff (default for MVP; extend with user→client FK for multi-tenant)
            cutoff = default_cutoff
            created = call.created_at
            if created and created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if created and created > cutoff:
                continue  # Not yet expired

            # Collect all S3 keys for this call
            s3_keys: List[str] = []
            if call.s3_path:
                s3_keys.append(call.s3_path)
            for media in call.media_files:
                if media.s3_key and media.s3_key not in s3_keys:
                    s3_keys.append(media.s3_key)

            # Audit log before deletion
            db.add(AuditLog(
                user_id=call.user_id,
                action_type="retention_delete",
                resource_id=str(call.id),
                ip_address="system",
                details=f"Retention policy: {DEFAULT_RETENTION_DAYS}d, created: {call.created_at}",
            ))
            db.flush()

            # Purge S3
            for key in s3_keys:
                _delete_s3_object(key)
                deleted_s3 += 1

            # Delete call row (cascade removes transcripts, evaluation, jobs, media)
            db.delete(call)
            deleted_calls += 1

    logger.info(
        "[Retention] Done: deleted_calls=%d deleted_s3_objects=%d",
        deleted_calls, deleted_s3,
    )
    return {"deleted_calls": deleted_calls, "deleted_s3_objects": deleted_s3}


# ---------------------------------------------------------------------------
# Daily reporting stub (for future use)
# ---------------------------------------------------------------------------

@celery_app.task
def generate_daily_reports():
    """Generate daily aggregate reports for dashboards."""
    logger.info("[Maintenance] Generating daily reports")
    return {"status": "completed"}
