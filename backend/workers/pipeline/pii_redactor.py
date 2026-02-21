"""
PII Redactor for call transcripts.

Scrubs personally identifiable information from transcript segments
before they are stored in the database.

Patterns detected (regex, always active):
  - Phone numbers
  - Email addresses
  - Credit card numbers
  - National ID / SSN-style numbers
  - Dates of birth

Named-entity redaction (optional, requires spaCy en_core_web_sm):
  - PERSON names  → [REDACTED_NAME]
  - ORG            → [REDACTED_ORG]
  - LOC / GPE      → [REDACTED_LOCATION]

Usage:
    from workers.pipeline.pii_redactor import redact_transcript
    clean_segments = redact_transcript(segments)
"""
import re
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Regex patterns
# ─────────────────────────────────────────────────────────────────────────────

_PATTERNS = [
    # Phone numbers (international + local formats)
    (
        re.compile(
            r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"
        ),
        "[REDACTED_PHONE]",
    ),
    # Email addresses
    (
        re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"),
        "[REDACTED_EMAIL]",
    ),
    # Credit card numbers (13-19 digits, optional spaces/dashes)
    (
        re.compile(r"\b(?:\d[ -]?){13,19}\b"),
        "[REDACTED_CARD]",
    ),
    # US Social Security Numbers (NNN-NN-NNNN)
    (
        re.compile(r"\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b"),
        "[REDACTED_SSN]",
    ),
    # Dates of birth: common formats (MM/DD/YYYY, DD-MM-YYYY, YYYY-MM-DD)
    (
        re.compile(
            r"\b(?:\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b"
        ),
        "[REDACTED_DATE]",
    ),
    # UK National Insurance (NN NNNNNN N)
    (
        re.compile(r"\b[A-Z]{2}\d{6}[A-D]\b", re.IGNORECASE),
        "[REDACTED_NIN]",
    ),
    # IBAN (simplified)
    (
        re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b"),
        "[REDACTED_IBAN]",
    ),
]


# ─────────────────────────────────────────────────────────────────────────────
# spaCy NER (optional)
# ─────────────────────────────────────────────────────────────────────────────

_NLP = None
_SPACY_AVAILABLE = False

try:
    import spacy  # type: ignore

    _NLP = spacy.load("en_core_web_sm")
    _SPACY_AVAILABLE = True
    logger.info("spaCy NER loaded (en_core_web_sm) — entity redaction enabled")
except Exception:
    logger.info(
        "spaCy / en_core_web_sm not available — using regex-only PII redaction"
    )

_ENTITY_REPLACEMENTS = {
    "PERSON": "[REDACTED_NAME]",
    "ORG": "[REDACTED_ORG]",
    "GPE": "[REDACTED_LOCATION]",
    "LOC": "[REDACTED_LOCATION]",
}


# ─────────────────────────────────────────────────────────────────────────────
# Core redaction functions
# ─────────────────────────────────────────────────────────────────────────────

def redact_text(text: str) -> str:
    """
    Apply all PII redaction rules to a single text string.
    Returns the sanitised string.
    """
    # 1. Regex patterns (always)
    for pattern, replacement in _PATTERNS:
        text = pattern.sub(replacement, text)

    # 2. spaCy NER (if available)
    if _SPACY_AVAILABLE and _NLP is not None:
        doc = _NLP(text)
        # Process in reverse so char offsets remain valid
        for ent in sorted(doc.ents, key=lambda e: e.start_char, reverse=True):
            replacement = _ENTITY_REPLACEMENTS.get(ent.label_)
            if replacement:
                text = text[: ent.start_char] + replacement + text[ent.end_char :]

    return text


def redact_transcript(
    segments: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Redact PII from a list of transcript segment dicts.

    Each segment is expected to have at least a 'text' key.
    Word-level 'words' lists (if present) are also redacted.

    Returns a new list — originals are not mutated.
    """
    cleaned = []
    for seg in segments:
        new_seg = dict(seg)
        if "text" in new_seg:
            new_seg["text"] = redact_text(new_seg["text"])
        # Also redact individual word-level text if present
        if "words" in new_seg and isinstance(new_seg["words"], list):
            new_seg["words"] = [
                {**w, "word": redact_text(w.get("word", ""))}
                if isinstance(w, dict)
                else w
                for w in new_seg["words"]
            ]
        cleaned.append(new_seg)
    return cleaned
