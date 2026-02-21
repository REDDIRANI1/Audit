import io
import boto3
from botocore.client import Config
from app.config import settings


def get_s3_client():
    """Get a boto3 S3 client configured for MinIO."""
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",
    )


def ensure_bucket_exists(bucket_name: str = None):
    """Create the S3 bucket if it doesn't exist."""
    bucket = bucket_name or settings.S3_BUCKET
    client = get_s3_client()
    try:
        client.head_bucket(Bucket=bucket)
    except Exception:
        client.create_bucket(Bucket=bucket)


def upload_file_to_s3(file_content: bytes, s3_key: str, content_type: str = "audio/wav") -> str:
    """Upload a file to S3/MinIO and return the S3 key."""
    client = get_s3_client()
    ensure_bucket_exists()
    client.put_object(
        Bucket=settings.S3_BUCKET,
        Key=s3_key,
        Body=file_content,
        ContentType=content_type,
    )
    return s3_key


def download_file_from_s3(s3_key: str) -> bytes:
    """Download a file from S3/MinIO."""
    client = get_s3_client()
    response = client.get_object(Bucket=settings.S3_BUCKET, Key=s3_key)
    return response["Body"].read()


def delete_file_from_s3(s3_key: str):
    """Delete a file from S3/MinIO."""
    client = get_s3_client()
    client.delete_object(Bucket=settings.S3_BUCKET, Key=s3_key)


def generate_presigned_url(s3_key: str, expiration: int = 3600) -> str:
    """Generate a presigned URL for direct download."""
    client = get_s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET, "Key": s3_key},
        ExpiresIn=expiration,
    )
