"""
Audio Normalizer – FFmpeg-based preprocessing.

Converts any input audio format to:
  - 16 000 Hz sample rate
  - Mono channel
  - 16-bit PCM WAV
  - EBU R128 loudness normalization (-23 LUFS)
"""
import logging
import os
import subprocess
import tempfile

logger = logging.getLogger(__name__)

FFMPEG_TIMEOUT = 600  # 10 minutes max


def normalize_audio(input_path: str) -> str:
    """
    Normalize audio file to 16kHz mono PCM WAV with loudness normalization.

    Args:
        input_path: Path to the source audio file (any format FFmpeg supports).

    Returns:
        Path to the normalized WAV file (in the same temp directory).

    Raises:
        RuntimeError: If FFmpeg fails.
    """
    base, _ = os.path.splitext(input_path)
    output_path = base + "_norm.wav"

    # Two-pass loudness normalization (EBU R128)
    cmd = [
        "ffmpeg",
        "-i", input_path,
        "-af", "loudnorm=I=-23:TP=-1:LRA=11",
        "-ar", "16000",
        "-ac", "1",
        "-c:a", "pcm_s16le",
        output_path,
        "-y",          # overwrite
        "-loglevel", "error",
    ]

    logger.info(f"[Normalizer] Running FFmpeg: {' '.join(cmd)}")
    try:
        result = subprocess.run(
            cmd,
            check=True,
            capture_output=True,
            timeout=FFMPEG_TIMEOUT,
        )
        logger.info(f"[Normalizer] Done → {output_path}")
        return output_path
    except subprocess.CalledProcessError as e:
        stderr = e.stderr.decode("utf-8", errors="replace")
        logger.error(f"[Normalizer] FFmpeg error: {stderr}")
        raise RuntimeError(f"FFmpeg normalization failed: {stderr[:500]}")
    except FileNotFoundError:
        logger.warning("[Normalizer] FFmpeg not found, skipping normalization")
        return input_path


def get_audio_duration(audio_path: str) -> float:
    """Return audio duration in seconds using FFprobe."""
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        audio_path,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, check=True, timeout=30)
        return float(result.stdout.strip())
    except Exception:
        return 0.0
