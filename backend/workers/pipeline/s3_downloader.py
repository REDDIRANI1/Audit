"""
S3 Download Helper for Celery Workers.

Downloads audio files from MinIO/S3 to a local temp directory.
"""
import logging
import os
import tempfile
import boto3
from botocore.client import Config

logger = logging.getLogger(__name__)


def get_s3_client():
    """Create a boto3 S3 client from environment variables."""
    return boto3.client(
        "s3",
        endpoint_url=os.environ.get("S3_ENDPOINT", "http://localhost:9000"),
        aws_access_key_id=os.environ.get("S3_ACCESS_KEY", "minioadmin"),
        aws_secret_access_key=os.environ.get("S3_SECRET_KEY", "minioadmin123"),
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",
    )


def download_audio(s3_path: str) -> str:
    """
    Download audio from S3/MinIO to a temporary local file.

    Args:
        s3_path: S3 key (e.g. "recordings/file.wav") or full s3://bucket/key URI.

    Returns:
        Local filesystem path to the downloaded file.
    """
    bucket = os.environ.get("S3_BUCKET", "audit-recordings")

    # Strip s3:// prefix if present
    if s3_path.startswith("s3://"):
        parts = s3_path[5:].split("/", 1)
        bucket = parts[0]
        key = parts[1]
    else:
        key = s3_path

    # Determine file extension from key
    ext = os.path.splitext(key)[-1] or ".wav"

    temp_dir = tempfile.mkdtemp(prefix="audit_ai_")
    local_path = os.path.join(temp_dir, f"input{ext}")

    logger.info(f"[S3] Downloading s3://{bucket}/{key} → {local_path}")

    client = get_s3_client()
    client.download_file(bucket, key, local_path)

    file_size = os.path.getsize(local_path)
    logger.info(f"[S3] Downloaded {file_size / (1024*1024):.1f} MB")

    return local_path


def cleanup_temp_dir(path: str):
    """Remove a temp directory and all its contents."""
    import shutil
    try:
        parent = os.path.dirname(path)
        if parent.startswith(tempfile.gettempdir()):
            shutil.rmtree(parent, ignore_errors=True)
    except Exception:
        pass
