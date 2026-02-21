import zipfile
import io
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.call import Call, CallStatus
from app.models.batch import Batch
from app.models.media_file import MediaFile
from app.schemas.call import UploadResponse, BulkUploadResponse
from app.services.storage_service import store_audio_file
from app.services.queue_service import enqueue_audio_job
from app.services.audit_service import log_action
from app.config import settings

router = APIRouter(prefix="/api", tags=["Upload"])

ALLOWED_AUDIO_EXTENSIONS = {"wav", "mp3"}


def validate_file_extension(filename: str) -> str:
    """Validate and return the file extension."""
    if "." not in filename:
        raise HTTPException(status_code=400, detail="File must have an extension")
    ext = filename.rsplit(".", 1)[-1].lower()
    all_allowed = ALLOWED_AUDIO_EXTENSIONS | {"zip"}
    if ext not in all_allowed:
        raise HTTPException(
            status_code=400,
            detail=f"File type .{ext} not allowed. Accepted: {', '.join(all_allowed)}",
        )
    return ext


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_call(
    request: Request,
    template_id: int = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a single audio file for processing."""
    ext = validate_file_extension(file.filename)

    if ext == "zip":
        raise HTTPException(
            status_code=400,
            detail="Use /api/upload/bulk for ZIP files",
        )

    # Read and validate file size
    content = await file.read()
    max_bytes = settings.UPLOAD_MAX_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum: {settings.UPLOAD_MAX_SIZE_MB}MB",
        )

    # Store in S3
    s3_key = await store_audio_file(content, current_user.id, file.filename)

    # Create DB record
    call = Call(
        user_id=current_user.id,
        template_id=template_id,
        s3_path=s3_key,
        status=CallStatus.QUEUED,
    )
    db.add(call)
    await db.flush()
    await db.refresh(call)

    # Create media file record
    media = MediaFile(
        call_id=call.id,
        s3_key=s3_key,
        original_filename=file.filename,
        file_size_bytes=len(content),
        mime_type=file.content_type,
    )
    db.add(media)

    # Enqueue processing job
    enqueue_audio_job(call.id, s3_key, template_id)

    # Audit log
    await log_action(
        db,
        user_id=current_user.id,
        action_type="upload",
        resource_id=str(call.id),
        ip_address=request.client.host if request.client else None,
    )

    return UploadResponse(call_id=call.id, status="queued")


@router.post("/upload/bulk", response_model=BulkUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_bulk(
    request: Request,
    template_id: int = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a ZIP file containing multiple audio files."""
    ext = validate_file_extension(file.filename)
    if ext != "zip":
        raise HTTPException(status_code=400, detail="Bulk upload requires a ZIP file")

    content = await file.read()
    max_bytes = settings.UPLOAD_MAX_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum: {settings.UPLOAD_MAX_SIZE_MB}MB",
        )

    # Create batch
    batch = Batch(
        batch_uuid=uuid4(),
        user_id=current_user.id,
    )
    db.add(batch)
    await db.flush()
    await db.refresh(batch)

    call_ids = []

    # Extract files from ZIP
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            audio_files = [
                name for name in zf.namelist()
                if name.rsplit(".", 1)[-1].lower() in ALLOWED_AUDIO_EXTENSIONS
                and not name.startswith("__MACOSX")
            ]

            if not audio_files:
                raise HTTPException(status_code=400, detail="ZIP contains no valid audio files")

            for audio_name in audio_files:
                audio_content = zf.read(audio_name)
                s3_key = await store_audio_file(audio_content, current_user.id, audio_name)

                call = Call(
                    user_id=current_user.id,
                    template_id=template_id,
                    batch_id=batch.batch_uuid,
                    s3_path=s3_key,
                    status=CallStatus.QUEUED,
                )
                db.add(call)
                await db.flush()
                await db.refresh(call)

                media = MediaFile(
                    call_id=call.id,
                    s3_key=s3_key,
                    original_filename=audio_name,
                    file_size_bytes=len(audio_content),
                )
                db.add(media)

                enqueue_audio_job(call.id, s3_key, template_id)
                call_ids.append(call.id)

            batch.num_calls = len(call_ids)

    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid ZIP file")

    # Audit log
    await log_action(
        db,
        user_id=current_user.id,
        action_type="bulk_upload",
        resource_id=str(batch.batch_uuid),
        ip_address=request.client.host if request.client else None,
        details=f"Uploaded {len(call_ids)} files",
    )

    return BulkUploadResponse(
        batch_id=str(batch.batch_uuid),
        call_ids=call_ids,
        total_files=len(call_ids),
    )
