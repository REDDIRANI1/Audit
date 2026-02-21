"""
Speaker Diarization using Pyannote Audio.

Requires:
    - HF_TOKEN environment variable (HuggingFace access token)
    - pyannote.audio >= 3.3

Falls back to VAD-based 2-speaker turn alternation if HF_TOKEN is missing.
"""
import logging
import os
from typing import List, Dict

logger = logging.getLogger(__name__)

# Speaker labels
SPEAKER_AGENT = "Agent"
SPEAKER_CUSTOMER = "Customer"


def run_diarization(
    audio_path: str,
    vad_segments: List[Dict[str, float]],
    num_speakers: int = 2,
) -> List[Dict]:
    """
    Run speaker diarization on a mono 16kHz WAV file.

    Args:
        audio_path: Path to normalized 16kHz mono WAV.
        vad_segments: Speech segments from VAD (for fallback).
        num_speakers: Expected number of speakers (default 2: agent + customer).

    Returns:
        List of speaker segments:
        [{"start": float, "end": float, "speaker": str}, ...]
    """
    hf_token = os.environ.get("HF_TOKEN", "")

    if not hf_token:
        logger.warning("[Diarizer] HF_TOKEN not set — using VAD-based fallback")
        return _vad_fallback_diarization(vad_segments)

    try:
        from pyannote.audio import Pipeline
        import torch

        logger.info("[Diarizer] Loading pyannote diarization pipeline")
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=hf_token,
        )

        # Use GPU if available
        device = "cuda" if torch.cuda.is_available() else "cpu"
        pipeline = pipeline.to(torch.device(device))
        logger.info(f"[Diarizer] Running on {device}")

        diarization = pipeline(
            audio_path,
            num_speakers=num_speakers,
        )

        segments = []
        speaker_map = {}  # maps pyannote speaker labels → Agent/Customer

        for turn, _, speaker in diarization.itertracks(yield_label=True):
            if speaker not in speaker_map:
                # First speaker encountered = Agent (typically opens the call)
                if not speaker_map:
                    speaker_map[speaker] = SPEAKER_AGENT
                else:
                    speaker_map[speaker] = SPEAKER_CUSTOMER

            segments.append({
                "start": round(turn.start, 3),
                "end": round(turn.end, 3),
                "speaker": speaker_map.get(speaker, speaker),
            })

        logger.info(f"[Diarizer] Found {len(segments)} segments with {len(speaker_map)} speakers")
        return sorted(segments, key=lambda x: x["start"])

    except ImportError:
        logger.warning("[Diarizer] pyannote.audio not installed — using VAD fallback")
        return _vad_fallback_diarization(vad_segments)
    except Exception as e:
        logger.warning(f"[Diarizer] Failed ({e}) — using VAD fallback")
        return _vad_fallback_diarization(vad_segments)


def _vad_fallback_diarization(
    vad_segments: List[Dict[str, float]],
) -> List[Dict]:
    """
    Fallback diarization: alternate Agent / Customer across VAD-detected
    speech turns.  Simple but surprisingly effective for call-centre audio
    where Agent always speaks first.
    """
    logger.info("[Diarizer] Using VAD-based turn alternation fallback")
    speakers = [SPEAKER_AGENT, SPEAKER_CUSTOMER]
    result = []
    for i, seg in enumerate(vad_segments):
        result.append({
            "start": seg["start"],
            "end": seg["end"],
            "speaker": speakers[i % 2],
        })
    logger.info(f"[Diarizer] Fallback produced {len(result)} segments")
    return result
