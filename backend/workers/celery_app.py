from celery import Celery
from celery.schedules import crontab

# Use a direct Redis URL instead of importing from app.config to avoid circular imports
import os

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "audit_ai",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    worker_max_tasks_per_child=100,
    task_track_started=True,
    task_default_queue="audio_jobs",
)

# Auto-discover tasks
celery_app.autodiscover_tasks(["workers.tasks"])

# Beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    "data-retention-cleanup": {
        "task": "workers.tasks.maintenance.cleanup_expired_data",
        "schedule": crontab(hour=2, minute=0),  # Run daily at 2 AM UTC
    },
}
