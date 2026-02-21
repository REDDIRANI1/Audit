import json
import redis
from app.config import settings

_redis_client = None


def get_redis_client():
    """Get a Redis client instance (singleton)."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis.from_url(settings.REDIS_URL)
    return _redis_client


def enqueue_audio_job(call_id: int, s3_path: str, template_id: int):
    """Enqueue an audio processing job to Redis."""
    client = get_redis_client()
    job = {
        "call_id": call_id,
        "s3_path": s3_path,
        "template_id": template_id,
    }
    client.rpush("audio_jobs", json.dumps(job))


def get_queue_length() -> int:
    """Get the current length of the audio processing queue."""
    client = get_redis_client()
    return client.llen("audio_jobs")
