"""
Audio Processing Pipeline – Phase 2 (Real ML Integration)

Orchestrates the full call analysis pipeline:
  1. Download audio from S3/MinIO
  2. Audio normalization (FFmpeg → 16kHz mono PCM)
  3. Voice Activity Detection (Silero VAD)
  4. Speaker Diarization (Pyannote / VAD fallback)
  5. ASR Transcription (Faster-Whisper)
  6. LLM Scoring (Ollama / rule-based fallback)
  7. Persist results to PostgreSQL

Each stage updates a ProcessingJob row so progress is visible in real-time.
"""
import logging
import sys
import os

from workers.celery_app import celery_app
from workers.pipeline.s3_downloader import download_audio, cleanup_temp_dir
from workers.pipeline.audio_normalizer import normalize_audio, get_audio_duration
from workers.pipeline.vad import run_vad
from workers.pipeline.diarizer import run_diarization
from workers.pipeline.transcriber import run_transcription
from workers.pipeline.llm_scorer import run_llm_scoring
from workers.pipeline.pci_redactor import detect_and_mute_dtmf
from workers.pipeline.db_persistence import (
    update_call_status,
    record_processing_job,
    save_transcript,
    save_evaluation,
    get_template,
)
import soundfile as sf

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
    name="workers.tasks.audio_pipeline.process_call",
)
def process_call(self, call_id: int, s3_path: str, template_id: int):
    """
    Main Celery task: process one audio call through the full ML pipeline.

    Args:
        call_id: database Call.id
        s3_path: S3 object key (or s3://bucket/key URI)
        template_id: ScoringTemplate.id for LLM prompt
    """
    logger.info(f"[Call {call_id}] ═══ Pipeline START (task_id={self.request.id}) ═══")

    local_path = None
    normalized_path = None

    try:
        # ── Mark call as processing ──────────────────────────────────────
        update_call_status(call_id, "processing")

        # ── Fetch scoring template ───────────────────────────────────────
        template = get_template(template_id)
        if not template:
            raise ValueError(f"ScoringTemplate {template_id} not found")

        system_prompt = template["system_prompt"]
        json_schema = template["json_schema"]

        # ════════════════════════════════════════════════════════════════
        # Stage 1: Download
        # ════════════════════════════════════════════════════════════════
        _stage_start(call_id, "normalize")   # reuse normalize stage for download
        self.update_state(state="PROGRESS", meta={"stage": "downloading", "call_id": call_id})
        logger.info(f"[Call {call_id}] Stage 1: Downloading from S3 ({s3_path})")
        local_path = download_audio(s3_path)

        # ════════════════════════════════════════════════════════════════
        # Stage 2: Normalize audio
        # ════════════════════════════════════════════════════════════════
        self.update_state(state="PROGRESS", meta={"stage": "normalizing", "call_id": call_id})
        logger.info(f"[Call {call_id}] Stage 2: Normalizing audio")
        normalized_path = normalize_audio(local_path)
        duration = get_audio_duration(normalized_path)
        
        # ── PCI Redaction (DTMF Muting) ──────────────────────────────────
        logger.info(f"[Call {call_id}] Running PCI redaction (DTMF check)")
        audio_data, samplerate = sf.read(normalized_path)
        redacted_data = detect_and_mute_dtmf(audio_data, samplerate)
        sf.write(normalized_path, redacted_data, samplerate)
        
        _stage_done(call_id, "normalize")

        # ════════════════════════════════════════════════════════════════
        # Stage 3: Voice Activity Detection
        # ════════════════════════════════════════════════════════════════
        _stage_start(call_id, "vad")
        self.update_state(state="PROGRESS", meta={"stage": "vad", "call_id": call_id})
        logger.info(f"[Call {call_id}] Stage 3: Voice Activity Detection")
        vad_segments = run_vad(normalized_path)
        _stage_done(call_id, "vad")

        # ════════════════════════════════════════════════════════════════
        # Stage 4: Speaker Diarization
        # ════════════════════════════════════════════════════════════════
        _stage_start(call_id, "diarize")
        self.update_state(state="PROGRESS", meta={"stage": "diarizing", "call_id": call_id})
        logger.info(f"[Call {call_id}] Stage 4: Speaker Diarization")
        speaker_segments = run_diarization(normalized_path, vad_segments)
        _stage_done(call_id, "diarize")

        # ════════════════════════════════════════════════════════════════
        # Stage 5: ASR Transcription
        # ════════════════════════════════════════════════════════════════
        _stage_start(call_id, "transcribe")
        self.update_state(state="PROGRESS", meta={"stage": "transcribing", "call_id": call_id})
        logger.info(f"[Call {call_id}] Stage 5: ASR Transcription")
        transcript = run_transcription(normalized_path, speaker_segments)
        _stage_done(call_id, "transcribe")

        # Persist transcript immediately (so UI can show it even if scoring fails)
        save_transcript(call_id, transcript)

        # ════════════════════════════════════════════════════════════════
        # Stage 6: LLM Scoring
        # ════════════════════════════════════════════════════════════════
        _stage_start(call_id, "score")
        self.update_state(state="PROGRESS", meta={"stage": "scoring", "call_id": call_id})
        logger.info(f"[Call {call_id}] Stage 6: LLM Scoring (template: {template['name']})")
        scores = run_llm_scoring(transcript, system_prompt, json_schema)
        _stage_done(call_id, "score")

        # Compute silence ratio (non-speech / total) for scoring penalty
        silence_ratio = None
        if duration and duration > 0 and vad_segments is not None:
            speech_duration = sum(seg.get("end", 0) - seg.get("start", 0) for seg in vad_segments)
            silence_ratio = max(0.0, 1.0 - (speech_duration / duration))
            scores["silence_ratio"] = silence_ratio

        # Persist evaluation results (scoring engine applies vertical formula inside)
        save_evaluation(call_id, scores, template_id=template_id)

        # ════════════════════════════════════════════════════════════════
        # Stage 7: Finalise
        # ════════════════════════════════════════════════════════════════
        update_call_status(call_id, "completed", duration_seconds=duration)
        logger.info(
            f"[Call {call_id}] ═══ Pipeline DONE "
            f"(score={scores.get('overall_score')}, duration={duration:.0f}s) ═══"
        )

        return {
            "call_id": call_id,
            "status": "completed",
            "overall_score": scores.get("overall_score"),
            "duration_seconds": duration,
        }

    except Exception as exc:
        logger.error(f"[Call {call_id}] Pipeline FAILED: {exc}", exc_info=True)
        try:
            update_call_status(call_id, "failed", error_message=str(exc))
        except Exception:
            pass
        raise self.retry(exc=exc, countdown=60)

    finally:
        # Always clean up temp files
        if local_path:
            cleanup_temp_dir(local_path)
        if normalized_path and normalized_path != local_path:
            try:
                os.remove(normalized_path)
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _stage_start(call_id: int, stage: str):
    try:
        record_processing_job(call_id, stage, "running")
    except Exception as e:
        logger.warning(f"[DB] Could not record stage start ({stage}): {e}")


def _stage_done(call_id: int, stage: str, error: str = None):
    try:
        status = "failed" if error else "completed"
        record_processing_job(call_id, stage, status, error_message=error)
    except Exception as e:
        logger.warning(f"[DB] Could not record stage done ({stage}): {e}")
