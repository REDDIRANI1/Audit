"""
Voice Activity Detection (VAD) using Silero VAD.

Silero VAD uses a lightweight ONNX model that works efficiently on CPU.
Detects speech segments in audio, filtering out silence/noise.
"""
import logging
import os
from typing import List, Dict

logger = logging.getLogger(__name__)

# Silence threshold for fallback
MIN_SPEECH_DURATION = 0.3   # seconds
MIN_SILENCE_DURATION = 0.3  # seconds


def run_vad(audio_path: str) -> List[Dict[str, float]]:
    """
    Run Silero VAD on 16kHz mono WAV audio.

    Args:
        audio_path: Path to 16kHz mono WAV file.

    Returns:
        List of speech segments: [{"start": float, "end": float}, ...]
    """
    try:
        import torch
        import torchaudio

        logger.info(f"[VAD] Loading Silero VAD model")
        model, utils = torch.hub.load(
            repo_or_dir="snakers4/silero-vad",
            model="silero_vad",
            force_reload=False,
            onnx=True,     # Use ONNX for CPU speed
        )
        (get_speech_timestamps, _, read_audio, *_) = utils

        logger.info(f"[VAD] Reading audio: {audio_path}")
        wav = read_audio(audio_path, sampling_rate=16000)

        logger.info("[VAD] Running inference")
        speech_timestamps = get_speech_timestamps(
            wav,
            model,
            sampling_rate=16000,
            min_speech_duration_ms=int(MIN_SPEECH_DURATION * 1000),
            min_silence_duration_ms=int(MIN_SILENCE_DURATION * 1000),
            return_seconds=True,
        )

        segments = [{"start": s["start"], "end": s["end"]} for s in speech_timestamps]
        total_speech = sum(s["end"] - s["start"] for s in segments)
        logger.info(f"[VAD] Found {len(segments)} speech segments, {total_speech:.1f}s total")
        return segments

    except ImportError:
        logger.warning("[VAD] torch/torchaudio not installed, using fallback")
        return _fallback_vad(audio_path)
    except Exception as e:
        logger.warning(f"[VAD] Silero VAD failed ({e}), using fallback")
        return _fallback_vad(audio_path)


def _fallback_vad(audio_path: str) -> List[Dict[str, float]]:
    """
    Fallback VAD: treat the entire file as speech.
    Uses soundfile to measure duration.
    """
    try:
        import soundfile as sf
        info = sf.info(audio_path)
        duration = info.duration
    except Exception:
        duration = 300.0  # 5 min default

    logger.info(f"[VAD] Fallback: full file as speech ({duration:.1f}s)")
    return [{"start": 0.0, "end": duration}]
