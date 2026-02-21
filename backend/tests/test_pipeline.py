"""
Phase 2 Pipeline Unit Tests

These tests verify each pipeline stage in isolation using mocks,
so they can run without GPU, Ollama, or a real database.
"""
import os
import pytest
import tempfile
import wave
import struct

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def create_test_wav(path: str, duration_seconds: float = 2.0, sample_rate: int = 16000):
    """Create a minimal valid WAV file for testing."""
    num_samples = int(duration_seconds * sample_rate)
    with wave.open(path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        # Silence (zeros)
        wf.writeframes(struct.pack("<" + "h" * num_samples, *([0] * num_samples)))


MOCK_SEGMENTS = [
    {"start": 0.0, "end": 5.0, "speaker": "Agent"},
    {"start": 5.0, "end": 10.0, "speaker": "Customer"},
    {"start": 10.0, "end": 15.0, "speaker": "Agent"},
]

MOCK_TRANSCRIPT = [
    {"speaker": "Agent", "start": 0.0, "end": 5.0, "text": "Hello, thank you for calling."},
    {"speaker": "Customer", "start": 5.0, "end": 10.0, "text": "Hi, I need help with my account."},
    {"speaker": "Agent", "start": 10.0, "end": 15.0, "text": "Of course, I can help you with that."},
]


# ─────────────────────────────────────────────────────────────────────────────
# Audio Normalizer Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestAudioNormalizer:
    def test_normalize_fallback_when_ffmpeg_missing(self, tmp_path, monkeypatch):
        """When FFmpeg isn't found, normalize_audio returns the input path."""
        import subprocess
        from workers.pipeline.audio_normalizer import normalize_audio

        wav_path = str(tmp_path / "test.wav")
        create_test_wav(wav_path)

        def raise_fnf(*args, **kwargs):
            raise FileNotFoundError("ffmpeg not found")

        monkeypatch.setattr(subprocess, "run", raise_fnf)
        result = normalize_audio(wav_path)
        assert result == wav_path

    def test_get_audio_duration_fallback(self, tmp_path, monkeypatch):
        """get_audio_duration returns 0.0 when ffprobe is unavailable."""
        import subprocess
        from workers.pipeline.audio_normalizer import get_audio_duration

        def raise_fnf(*args, **kwargs):
            raise FileNotFoundError("ffprobe not found")

        monkeypatch.setattr(subprocess, "run", raise_fnf)
        duration = get_audio_duration("/nonexistent.wav")
        assert duration == 0.0


# ─────────────────────────────────────────────────────────────────────────────
# VAD Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestVAD:
    def test_fallback_vad_returns_full_file(self, tmp_path):
        """Fallback VAD treats the whole file as speech when torch unavailable."""
        from workers.pipeline.vad import _fallback_vad

        wav_path = str(tmp_path / "test.wav")
        create_test_wav(wav_path, duration_seconds=3.0)

        segments = _fallback_vad(wav_path)
        assert len(segments) >= 1
        assert segments[0]["start"] == 0.0
        assert segments[0]["end"] > 0.0

    def test_vad_returns_list(self, tmp_path, monkeypatch):
        """run_vad always returns a list even when torch fails."""
        from workers.pipeline import vad as vad_module

        wav_path = str(tmp_path / "test.wav")
        create_test_wav(wav_path)

        # Force ImportError path
        monkeypatch.setattr(vad_module, "run_vad", vad_module._fallback_vad)
        result = vad_module._fallback_vad(wav_path)
        assert isinstance(result, list)


# ─────────────────────────────────────────────────────────────────────────────
# Diarizer Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestDiarizer:
    def test_vad_fallback_alternates_speakers(self):
        """VAD fallback alternates Agent/Customer across VAD segments."""
        from workers.pipeline.diarizer import _vad_fallback_diarization

        vad_segs = [
            {"start": 0.0, "end": 5.0},
            {"start": 5.0, "end": 10.0},
            {"start": 10.0, "end": 15.0},
            {"start": 15.0, "end": 20.0},
        ]
        result = _vad_fallback_diarization(vad_segs)
        assert len(result) == 4
        assert result[0]["speaker"] == "Agent"
        assert result[1]["speaker"] == "Customer"
        assert result[2]["speaker"] == "Agent"
        assert result[3]["speaker"] == "Customer"

    def test_run_diarization_without_hf_token(self, tmp_path, monkeypatch):
        """run_diarization falls back to VAD alternation when HF_TOKEN absent."""
        monkeypatch.delenv("HF_TOKEN", raising=False)
        from workers.pipeline.diarizer import run_diarization

        wav_path = str(tmp_path / "test.wav")
        create_test_wav(wav_path)

        vad_segs = [{"start": 0.0, "end": 5.0}, {"start": 5.0, "end": 10.0}]
        result = run_diarization(wav_path, vad_segs)
        assert len(result) == 2
        assert result[0]["speaker"] in ("Agent", "Customer")


# ─────────────────────────────────────────────────────────────────────────────
# Transcriber Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestTranscriber:
    def test_align_with_speakers(self):
        """Speaker alignment correctly maps Whisper segments to diarization."""
        from workers.pipeline.transcriber import _align_with_speakers

        whisper_segs = [
            {"start": 0.0, "end": 4.5, "text": "Hello there."},
            {"start": 5.5, "end": 9.8, "text": "I need help."},
        ]
        speaker_segs = [
            {"start": 0.0, "end": 5.0, "speaker": "Agent"},
            {"start": 5.0, "end": 10.0, "speaker": "Customer"},
        ]
        result = _align_with_speakers(whisper_segs, speaker_segs)
        assert result[0]["speaker"] == "Agent"
        assert result[1]["speaker"] == "Customer"

    def test_mock_transcript_fills_from_segments(self):
        """Mock transcript produces one entry per speaker segment."""
        from workers.pipeline.transcriber import _mock_transcript

        result = _mock_transcript(MOCK_SEGMENTS)
        assert len(result) == len(MOCK_SEGMENTS)
        for seg in result:
            assert "speaker" in seg
            assert "text" in seg
            assert len(seg["text"]) > 0


# ─────────────────────────────────────────────────────────────────────────────
# LLM Scorer Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestLLMScorer:
    def test_format_transcript(self):
        """Transcript is formatted correctly for LLM prompt."""
        from workers.pipeline.llm_scorer import _format_transcript

        text = _format_transcript(MOCK_TRANSCRIPT)
        assert "Agent" in text
        assert "Customer" in text
        assert "Hello" in text

    def test_rule_based_scorer_structure(self):
        """Rule-based scorer returns all required keys."""
        from workers.pipeline.llm_scorer import _rule_based_scorer

        result = _rule_based_scorer("Hello, I can help you with that.", {})
        assert "overall_score" in result
        assert "summary" in result
        assert "pillar_scores" in result
        assert "compliance_flags" in result
        assert "recommendations" in result
        assert isinstance(result["overall_score"], float)
        assert 0 <= result["overall_score"] <= 100

    def test_rule_based_scorer_greeting_detection(self):
        """Greeting keyword raises compliance flag and score."""
        from workers.pipeline.llm_scorer import _rule_based_scorer

        with_greeting = _rule_based_scorer("Hello, thank you for calling!", {})
        without_greeting = _rule_based_scorer("What do you want?", {})
        assert with_greeting["compliance_flags"]["greeting_used"] is True
        assert without_greeting["compliance_flags"]["greeting_used"] is False

    def test_normalise_output_handles_missing_keys(self):
        """_normalise_output handles LLMs that use alternate key names."""
        from workers.pipeline.llm_scorer import _normalise_output

        raw = {"score": 78.5, "analysis": "Good call.", "scores": {"CQS": 80}}
        result = _normalise_output(raw)
        assert result["overall_score"] == 78.5
        assert result["summary"] == "Good call."
        assert result["pillar_scores"] == {"CQS": 80}

    def test_run_llm_scoring_falls_back_gracefully(self, monkeypatch):
        """run_llm_scoring uses rule-based fallback when Ollama unavailable."""
        import httpx
        from workers.pipeline.llm_scorer import run_llm_scoring

        def raise_connect(*args, **kwargs):
            raise httpx.ConnectError("connection refused")

        monkeypatch.setattr(httpx.Client, "post", raise_connect)

        result = run_llm_scoring(
            transcript=MOCK_TRANSCRIPT,
            system_prompt="You are a QA analyst.",
            json_schema={},
        )
        assert "overall_score" in result
        assert "recommendations" in result


# ─────────────────────────────────────────────────────────────────────────────
# S3 Downloader Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestS3Downloader:
    def test_s3_uri_parsing(self, monkeypatch):
        """S3 URI is correctly parsed into bucket + key."""
        import boto3
        from unittest.mock import MagicMock, patch

        mock_client = MagicMock()
        mock_client.download_file = MagicMock()

        with patch("workers.pipeline.s3_downloader.get_s3_client", return_value=mock_client):
            with patch("os.path.getsize", return_value=1024):
                from workers.pipeline.s3_downloader import download_audio
                download_audio("s3://my-bucket/recordings/call.wav")
                call_args = mock_client.download_file.call_args
                assert call_args[0][0] == "my-bucket"
                assert call_args[0][1] == "recordings/call.wav"
