"""
Audio Processing Pipeline Task

This Celery task orchestrates the complete audio processing pipeline:
1. Audio Standardization (FFmpeg)
2. Voice Activity Detection (Silero VAD)
3. Speaker Diarization (Pyannote)
4. ASR Transcription (Faster-Whisper)
5. LLM Scoring & Extraction

For Phase 1 (MVP), this task contains stubs for each stage.
Full ML integration will be added in Phase 2.
"""
import json
import logging
import subprocess
import tempfile
import os
from datetime import datetime, timezone
from workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def process_call(self, call_id: int, s3_path: str, template_id: int):
    """Main pipeline task: process a single audio call through all stages."""
    logger.info(f"[Call {call_id}] Starting pipeline processing")

    try:
        # Update call status to processing
        _update_call_status(call_id, "processing")

        # Stage 1: Download from S3
        self.update_state(state="PROGRESS", meta={"stage": "downloading", "call_id": call_id})
        logger.info(f"[Call {call_id}] Stage 1: Downloading audio from S3")
        local_path = _download_audio(s3_path)

        # Stage 2: Audio Normalization (FFmpeg)
        self.update_state(state="PROGRESS", meta={"stage": "normalizing", "call_id": call_id})
        logger.info(f"[Call {call_id}] Stage 2: Normalizing audio")
        normalized_path = _normalize_audio(local_path)

        # Stage 3: Voice Activity Detection
        self.update_state(state="PROGRESS", meta={"stage": "vad", "call_id": call_id})
        logger.info(f"[Call {call_id}] Stage 3: Running VAD")
        vad_segments = _run_vad(normalized_path)

        # Stage 4: Speaker Diarization
        self.update_state(state="PROGRESS", meta={"stage": "diarizing", "call_id": call_id})
        logger.info(f"[Call {call_id}] Stage 4: Speaker diarization")
        speaker_segments = _run_diarization(normalized_path)

        # Stage 5: ASR Transcription
        self.update_state(state="PROGRESS", meta={"stage": "transcribing", "call_id": call_id})
        logger.info(f"[Call {call_id}] Stage 5: Transcription")
        transcript = _run_transcription(normalized_path, speaker_segments)

        # Stage 6: LLM Scoring
        self.update_state(state="PROGRESS", meta={"stage": "scoring", "call_id": call_id})
        logger.info(f"[Call {call_id}] Stage 6: LLM scoring")
        scores = _run_llm_scoring(transcript, template_id)

        # Stage 7: Save results
        self.update_state(state="PROGRESS", meta={"stage": "saving", "call_id": call_id})
        logger.info(f"[Call {call_id}] Stage 7: Saving results")
        _save_results(call_id, transcript, scores)

        # Update call status to completed
        _update_call_status(call_id, "completed")
        logger.info(f"[Call {call_id}] Pipeline completed successfully")

        # Cleanup temp files
        _cleanup_temp_files(local_path, normalized_path)

        return {"call_id": call_id, "status": "completed"}

    except Exception as exc:
        logger.error(f"[Call {call_id}] Pipeline failed: {exc}")
        _update_call_status(call_id, "failed", str(exc))
        raise self.retry(exc=exc, countdown=30)


# ---------------------------------------------------------------------------
# Stub implementations for each pipeline stage (to be replaced in Phase 2)
# ---------------------------------------------------------------------------

def _download_audio(s3_path: str) -> str:
    """Download audio from S3. Stub: returns temp path."""
    # TODO Phase 2: Actually download from S3
    temp_dir = tempfile.mkdtemp()
    local_path = os.path.join(temp_dir, "input.wav")
    logger.info(f"[Stub] Would download {s3_path} to {local_path}")
    # Create a placeholder file
    with open(local_path, "wb") as f:
        f.write(b"")
    return local_path


def _normalize_audio(input_path: str) -> str:
    """Normalize audio to 16kHz mono WAV using FFmpeg."""
    output_path = input_path.replace(".wav", "_norm.wav")
    try:
        cmd = [
            "ffmpeg", "-i", input_path,
            "-ar", "16000", "-ac", "1",
            "-c:a", "pcm_s16le", output_path, "-y"
        ]
        subprocess.run(cmd, check=True, capture_output=True, timeout=300)
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        logger.warning(f"[Stub] FFmpeg normalization skipped: {e}")
        output_path = input_path
    return output_path


def _run_vad(audio_path: str) -> list:
    """Run Voice Activity Detection. Stub returns full audio as one segment."""
    # TODO Phase 2: Integrate Silero VAD
    logger.info("[Stub] VAD - returning full audio as speech")
    return [{"start": 0.0, "end": 300.0}]


def _run_diarization(audio_path: str) -> list:
    """Run speaker diarization. Stub returns two alternating speakers."""
    # TODO Phase 2: Integrate Pyannote
    logger.info("[Stub] Diarization - returning mock speaker segments")
    return [
        {"start": 0.0, "end": 15.0, "speaker": "Agent"},
        {"start": 15.0, "end": 30.0, "speaker": "Customer"},
        {"start": 30.0, "end": 45.0, "speaker": "Agent"},
        {"start": 45.0, "end": 60.0, "speaker": "Customer"},
    ]


def _run_transcription(audio_path: str, speaker_segments: list) -> list:
    """Run ASR transcription. Stub returns mock transcript."""
    # TODO Phase 2: Integrate Faster-Whisper
    logger.info("[Stub] Transcription - returning mock transcript")
    return [
        {"speaker": "Agent", "start": 0.0, "end": 15.0, "text": "Hello, thank you for calling. How can I help you today?"},
        {"speaker": "Customer", "start": 15.0, "end": 30.0, "text": "Hi, I'm interested in your enterprise plan."},
        {"speaker": "Agent", "start": 30.0, "end": 45.0, "text": "Great! Let me tell you about our features and pricing."},
        {"speaker": "Customer", "start": 45.0, "end": 60.0, "text": "That sounds perfect. Can you send me a proposal?"},
    ]


def _run_llm_scoring(transcript: list, template_id: int) -> dict:
    """Run LLM scoring. Stub returns mock scores."""
    # TODO Phase 2: Integrate vLLM / llama.cpp
    logger.info("[Stub] LLM Scoring - returning mock scores")
    return {
        "overall_score": 85.5,
        "summary": "Agent performed well with clear communication and product knowledge.",
        "compliance_flags": {
            "greeting_used": True,
            "disclosure_of_recording": True,
            "proper_closing": True,
        },
        "pillar_scores": {
            "CQS": 88,
            "ECS": 82,
            "PHS": 85,
            "DIS": 80,
            "ROS": 90,
        },
        "recommendations": [
            "Ask about budget earlier in the conversation",
            "Provide specific timeline for proposal delivery",
        ],
    }


def _save_results(call_id: int, transcript: list, scores: dict):
    """Save transcript and scores to database. Stub: logs the data."""
    # TODO: Use async DB session or sync equivalent
    logger.info(f"[Stub] Would save {len(transcript)} transcript segments and scores for call {call_id}")
    logger.info(f"[Stub] Overall score: {scores.get('overall_score')}")


def _update_call_status(call_id: int, status: str, error_message: str = None):
    """Update call status in database. Stub: logs the status change."""
    # TODO: Use sync DB session
    logger.info(f"[Stub] Call {call_id} status -> {status}")
    if error_message:
        logger.error(f"[Stub] Call {call_id} error: {error_message}")


def _cleanup_temp_files(*paths):
    """Clean up temporary files."""
    for path in paths:
        try:
            if path and os.path.exists(path):
                os.remove(path)
        except Exception:
            pass
