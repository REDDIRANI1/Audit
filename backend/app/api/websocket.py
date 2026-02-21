"""
Enhanced WebSocket handler with:
- Per-call progress channels (/ws/call/{call_id})
- Broadcast helpers for Celery workers (via Redis pub/sub)
- Existing per-user notification channel (/ws/notifications/{user_id})
"""
import json
import os
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio

router = APIRouter(tags=["WebSocket"])

PIPELINE_STAGES = ["normalize", "vad", "diarize", "transcribe", "score"]
STAGE_LABELS = {
    "normalize": "Audio Normalization",
    "vad": "Voice Activity Detection",
    "diarize": "Speaker Diarization",
    "transcribe": "Transcription",
    "score": "LLM Scoring",
}


class ConnectionManager:
    """Manages active WebSocket connections for real-time notifications."""

    def __init__(self):
        # user_id -> set of websockets
        self.user_connections: Dict[int, Set[WebSocket]] = {}
        # call_id -> set of websockets
        self.call_connections: Dict[int, Set[WebSocket]] = {}

    # ── User notification channel ─────────────────────────────────────────

    async def connect_user(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.user_connections.setdefault(user_id, set()).add(websocket)

    def disconnect_user(self, websocket: WebSocket, user_id: int):
        if user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]

    async def send_to_user(self, user_id: int, message: dict):
        for ws in list(self.user_connections.get(user_id, [])):
            try:
                await ws.send_json(message)
            except Exception:
                self.user_connections[user_id].discard(ws)

    # ── Call progress channel ─────────────────────────────────────────────

    async def connect_call(self, websocket: WebSocket, call_id: int):
        await websocket.accept()
        self.call_connections.setdefault(call_id, set()).add(websocket)

    def disconnect_call(self, websocket: WebSocket, call_id: int):
        if call_id in self.call_connections:
            self.call_connections[call_id].discard(websocket)
            if not self.call_connections[call_id]:
                del self.call_connections[call_id]

    async def send_to_call(self, call_id: int, message: dict):
        for ws in list(self.call_connections.get(call_id, [])):
            try:
                await ws.send_json(message)
            except Exception:
                self.call_connections[call_id].discard(ws)

    async def broadcast(self, message: dict):
        for user_id in list(self.user_connections.keys()):
            await self.send_to_user(user_id, message)


manager = ConnectionManager()


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.websocket("/ws/notifications/{user_id}")
async def websocket_user_endpoint(websocket: WebSocket, user_id: int):
    """WebSocket endpoint for real-time per-user notifications."""
    await manager.connect_user(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect_user(websocket, user_id)


@router.websocket("/ws/call/{call_id}")
async def websocket_call_progress(websocket: WebSocket, call_id: int):
    """
    WebSocket endpoint for real-time call pipeline progress.

    The client connects here after upload.
    The server polls the DB every 2 seconds and pushes stage updates.
    On completion or failure, sends a final message and closes.
    """
    await manager.connect_call(websocket, call_id)
    try:
        from app.database import AsyncSessionLocal
        from app.models.processing_job import ProcessingJob
        from app.models.call import Call
        from sqlalchemy import select

        last_stage_statuses: Dict[str, str] = {}
        max_poll = 300  # 5 min max polling

        for _ in range(max_poll):
            async with AsyncSessionLocal() as db:
                # Get call status
                call_res = await db.execute(
                    select(Call.status, Call.error_message).where(Call.id == call_id)
                )
                call = call_res.first()

                jobs_res = await db.execute(
                    select(ProcessingJob).where(ProcessingJob.call_id == call_id)
                )
                jobs = {j.stage: j for j in jobs_res.scalars().all()}

            # Build stage snapshots
            stages = []
            for stage_name in PIPELINE_STAGES:
                job = jobs.get(stage_name)
                status = job.status if job else "pending"
                stages.append({
                    "stage": stage_name,
                    "label": STAGE_LABELS[stage_name],
                    "status": status,
                    "error": job.error_message if job else None,
                })

            # Determine overall progress %
            completed = sum(1 for s in stages if s["status"] == "completed")
            progress_pct = int((completed / len(PIPELINE_STAGES)) * 100)

            # Send update if something changed
            current_statuses = {s["stage"]: s["status"] for s in stages}
            if current_statuses != last_stage_statuses:
                await websocket.send_json({
                    "type": "pipeline_progress",
                    "call_id": call_id,
                    "call_status": call.status if call else "unknown",
                    "progress_pct": progress_pct,
                    "stages": stages,
                })
                last_stage_statuses = current_statuses

            # Terminal states → send final update and stop
            if call and call.status in ("completed", "failed"):
                await websocket.send_json({
                    "type": "pipeline_complete",
                    "call_id": call_id,
                    "call_status": call.status,
                    "progress_pct": 100 if call.status == "completed" else progress_pct,
                    "error_message": call.error_message,
                })
                break

            await asyncio.sleep(2)

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect_call(websocket, call_id)
