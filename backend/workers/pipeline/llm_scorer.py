"""
LLM Scoring Service via Ollama.

Uses Ollama's local HTTP API to score calls against a ScoringTemplate.
Supports Llama 3.2 3B (CPU) or any other Ollama model.

Fallback:
    - If Ollama is unavailable, a rule-based scorer is used that counts
      keyword patterns in the transcript to produce rough pillar scores.
"""
import json
import logging
import os
import re
from typing import Dict, List, Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2:3b")
OLLAMA_TIMEOUT = int(os.environ.get("OLLAMA_TIMEOUT", "300"))


# ---------------------------------------------------------------------------
# Main scoring function
# ---------------------------------------------------------------------------

def run_llm_scoring(
    transcript: List[Dict],
    system_prompt: str,
    json_schema: Dict,
    call_metadata: Dict = None,
) -> Dict[str, Any]:
    """
    Score a call transcript using the LLM.

    Args:
        transcript: List of {speaker, start, end, text} segments.
        system_prompt: ScoringTemplate.system_prompt.
        json_schema: ScoringTemplate.json_schema (expected output structure).
        call_metadata: Optional metadata (duration, agent_id, etc.).

    Returns:
        Scoring result dict with at minimum:
        {
            "overall_score": float,
            "summary": str,
            "pillar_scores": {...},
            "compliance_flags": {...},
            "recommendations": [...],
        }
    """
    transcript_text = _format_transcript(transcript)

    try:
        result = _call_ollama(system_prompt, transcript_text, json_schema)
        logger.info(f"[LLM] Ollama scoring succeeded. Overall={result.get('overall_score')}")
        return result
    except Exception as e:
        logger.warning(f"[LLM] Ollama unavailable ({e}), using rule-based scorer")
        return _rule_based_scorer(transcript_text, json_schema)


# ---------------------------------------------------------------------------
# Ollama HTTP client
# ---------------------------------------------------------------------------

@retry(
    retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
)
def _call_ollama(system_prompt: str, transcript_text: str, json_schema: Dict) -> Dict:
    """Send a request to Ollama and parse the JSON response."""

    schema_str = json.dumps(json_schema, indent=2) if json_schema else "{}"

    user_message = f"""Analyze the following call transcript and return a JSON object matching the schema.

## JSON Schema
```json
{schema_str}
```

## Call Transcript
{transcript_text}

## Instructions
- Evaluate the agent's performance on each dimension in the schema
- Score each pillar 0-100
- Set overall_score as weighted average
- List 2-3 concrete recommendations
- Identify compliance flags as boolean fields
- Return ONLY valid JSON, no explanation text
"""

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.1,   # low temp for consistent scoring
            "num_predict": 1024,
        },
    }

    logger.info(f"[LLM] Calling Ollama at {OLLAMA_BASE_URL} model={OLLAMA_MODEL}")
    with httpx.Client(timeout=OLLAMA_TIMEOUT) as client:
        response = client.post(f"{OLLAMA_BASE_URL}/api/chat", json=payload)
        response.raise_for_status()

    data = response.json()
    content = data["message"]["content"]

    # Parse JSON — strip markdown code fences if present
    content = re.sub(r"```json\s*|\s*```", "", content).strip()

    result = json.loads(content)
    return _normalise_output(result)


# ---------------------------------------------------------------------------
# Rule-based fallback scorer
# ---------------------------------------------------------------------------

def _rule_based_scorer(transcript_text: str, json_schema: Dict) -> Dict:
    """
    Simple keyword-based fallback when Ollama is unavailable.
    Scores are heuristic — not a replacement for LLM scoring.
    """
    text_lower = transcript_text.lower()

    greeting = any(w in text_lower for w in ["hello", "hi", "good morning", "thank you for calling"])
    closure = any(w in text_lower for w in ["is there anything else", "have a great day", "goodbye", "thank you"])
    empathy = any(w in text_lower for w in ["understand", "sorry", "apologize", "i see", "of course"])
    resolution = any(w in text_lower for w in ["resolved", "fixed", "waive", "refund", "arrange", "confirm"])

    pillar_scores = {
        "Communication Quality": 75 + (10 if greeting else 0) + (5 if empathy else 0),
        "Empathy & Customer Service": 70 + (20 if empathy else 0),
        "Process Handling": 70 + (15 if resolution else 0),
        "Disclosure & Compliance": 70 + (15 if greeting else 0) + (10 if closure else 0),
        "Resolution & Outcome": 65 + (25 if resolution else 0),
    }

    for k in pillar_scores:
        pillar_scores[k] = min(100, pillar_scores[k])

    overall = round(sum(pillar_scores.values()) / len(pillar_scores), 1)

    recommendations = []
    if not greeting:
        recommendations.append("Ensure you greet the customer professionally at the start of each call.")
    if not empathy:
        recommendations.append("Use empathetic language to acknowledge the customer's situation.")
    if not closure:
        recommendations.append("Close the call by asking if there's anything else you can help with.")
    if not recommendations:
        recommendations.append("Good performance overall. Continue maintaining call quality standards.")

    return {
        "overall_score": overall,
        "summary": (
            "Call evaluated using rule-based scoring (LLM unavailable). "
            f"Agent {'used' if greeting else 'missed'} greeting, "
            f"{'showed' if empathy else 'lacked'} empathy, "
            f"{'achieved' if resolution else 'may not have achieved'} resolution."
        ),
        "pillar_scores": pillar_scores,
        "compliance_flags": {
            "greeting_used": greeting,
            "proper_closing": closure,
            "empathy_demonstrated": empathy,
            "issue_resolved": resolution,
        },
        "recommendations": recommendations,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _format_transcript(transcript: List[Dict]) -> str:
    """Format transcript segments into a readable string for the LLM."""
    lines = []
    for seg in transcript:
        speaker = seg.get("speaker", "Unknown")
        text = seg.get("text", "").strip()
        start = seg.get("start", 0)
        if text:
            lines.append(f"[{start:.1f}s] {speaker}: {text}")
    return "\n".join(lines)


def _normalise_output(raw: Dict) -> Dict:
    """Ensure standard keys exist in the LLM output."""
    return {
        "overall_score": float(raw.get("overall_score", raw.get("score", 0))),
        "summary": str(raw.get("summary", raw.get("analysis", ""))),
        "pillar_scores": dict(raw.get("pillar_scores", raw.get("scores", {}))),
        "compliance_flags": dict(raw.get("compliance_flags", raw.get("compliance", {}))),
        "recommendations": list(raw.get("recommendations", raw.get("improvements", []))),
        "raw_output": raw,
    }
