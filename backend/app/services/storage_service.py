from uuid import uuid4
from app.utils.s3 import upload_file_to_s3, download_file_from_s3, delete_file_from_s3, generate_presigned_url


def generate_s3_key(user_id: int, filename: str) -> str:
    """Generate a unique S3 key for an uploaded file."""
    unique_id = uuid4().hex[:12]
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "wav"
    return f"calls/{user_id}/{unique_id}.{ext}"


async def store_audio_file(file_content: bytes, user_id: int, filename: str) -> str:
    """Store an audio file in S3 and return the S3 key."""
    s3_key = generate_s3_key(user_id, filename)
    content_type = "audio/wav" if filename.endswith(".wav") else "audio/mpeg"
    if filename.endswith(".zip"):
        content_type = "application/zip"
    upload_file_to_s3(file_content, s3_key, content_type)
    return s3_key


async def get_audio_file(s3_key: str) -> bytes:
    """Download an audio file from S3."""
    return download_file_from_s3(s3_key)


async def remove_audio_file(s3_key: str):
    """Delete an audio file from S3."""
    delete_file_from_s3(s3_key)


async def get_download_url(s3_key: str, expiration: int = 3600) -> str:
    """Get a presigned URL for audio download."""
    return generate_presigned_url(s3_key, expiration)
