"""
Vertical Scoring Engine – SES / SQS / RES

Applies the PRD-defined weighted pillar formulas to LLM pillar_scores,
computing a named composite score (Sales Excellence Score, Service Quality
Score, or Recovery Efficiency Score) appropriate to the template's vertical.

Usage:
    from app.services.scoring_engine import apply_vertical_scoring
    scored = apply_vertical_scoring(llm_result, vertical="Sales", silence_ratio=0.05)
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Pillar weight tables (weights sum to 1.0)
# ---------------------------------------------------------------------------

SALES_WEIGHTS: Dict[str, float] = {
    # Key = lower-cased substring to match against LLM pillar name
    "conversation quality": 0.28,
    "cqs": 0.28,
    "execution": 0.22,
    "cadence": 0.22,
    "ecs": 0.22,
    "pipeline health": 0.17,
    "phs": 0.17,
    "deal intelligence": 0.18,
    "dis": 0.18,
    "revenue outcome": 0.15,
    "ros": 0.15,
}

SUPPORT_WEIGHTS: Dict[str, float] = {
    "first contact resolution": 0.30,
    "first-contact resolution": 0.30,
    "fcr": 0.30,
    "empathy": 0.25,
    "emp": 0.25,
    "efficiency": 0.20,
    "eff": 0.20,
    "satisfaction": 0.15,
    "sat": 0.15,
    "product knowledge": 0.10,
    "prk": 0.10,
}

COLLECTIONS_WEIGHTS: Dict[str, float] = {
    "compliance": 0.40,
    "ethics": 0.40,
    "cmp": 0.40,
    "negotiation": 0.25,
    "neg": 0.25,
    "promise": 0.20,
    "ptp": 0.20,
    "amount": 0.15,
    "amt": 0.15,
}

# Human-readable labels per vertical
VERTICAL_META: Dict[str, Dict[str, str]] = {
    "sales": {"label": "SES", "name": "Sales Excellence Score"},
    "support": {"label": "SQS", "name": "Service Quality Score"},
    "collections": {"label": "RES", "name": "Recovery Efficiency Score"},
}

# Silence penalty threshold (from PRD: >20% silence → penalty up to 5 pts)
SILENCE_PENALTY_THRESHOLD = 0.20
SILENCE_PENALTY_MAX = 5.0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def apply_vertical_scoring(
    llm_result: Dict[str, Any],
    vertical: str,
    silence_ratio: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Apply the PRD-defined weighted formula for the given vertical.

    Args:
        llm_result:     Normalised output from run_llm_scoring().
        vertical:       ScoringTemplate.vertical  ("Sales" | "Support" | "Collections")
        silence_ratio:  Optional fraction 0–1 of audio that was silence.

    Returns:
        Updated result dict with:
          • overall_score   – composite weighted score (0–100, capped)
          • score_label     – "SES" | "SQS" | "RES"
          • score_name      – full name of the score
          • pillar_breakdown – weighted contribution per matched pillar
          • fatal_flaw      – bool (True if Collections CMP breach)
          • silence_penalty – points deducted for excessive silence
    """
    v_key = vertical.lower() if vertical else "sales"

    if v_key == "support":
        weight_table = SUPPORT_WEIGHTS
    elif v_key in ("collections", "collection"):
        weight_table = COLLECTIONS_WEIGHTS
        v_key = "collections"
    else:
        weight_table = SALES_WEIGHTS
        v_key = "sales"

    meta = VERTICAL_META.get(v_key, VERTICAL_META["sales"])
    pillar_scores: Dict[str, Any] = llm_result.get("pillar_scores", {})

    # ------------------------------------------------------------------ #
    # Match pillar names from LLM output → weight table (fuzzy substring) #
    # ------------------------------------------------------------------ #
    matched: Dict[str, Dict[str, float]] = {}
    for pillar_name, raw_score in pillar_scores.items():
        try:
            score = float(raw_score)
        except (TypeError, ValueError):
            continue
        score = max(0.0, min(100.0, score))

        key_lower = pillar_name.lower()
        weight = None
        matched_key = None
        for table_key, w in weight_table.items():
            if table_key in key_lower or key_lower in table_key:
                weight = w
                matched_key = table_key
                break

        if weight is not None:
            matched[pillar_name] = {"score": score, "weight": weight, "matched_key": matched_key}

    # If nothing matched (LLM used unexpected names) fall back to equal weights
    if not matched and pillar_scores:
        logger.warning(
            "[ScoringEngine] No pillar names matched weights for vertical=%s – "
            "using equal weights fallback", v_key
        )
        n = len(pillar_scores)
        eq_weight = 1.0 / n
        for pillar_name, raw_score in pillar_scores.items():
            try:
                score = float(raw_score)
            except (TypeError, ValueError):
                continue
            matched[pillar_name] = {"score": score, "weight": eq_weight, "matched_key": None}

    # ------------------------------------------------------------------ #
    # Collections fatal flaw: CMP breach → RES = 0                       #
    # ------------------------------------------------------------------ #
    fatal_flaw = False
    if v_key == "collections":
        cmp_entry = next(
            (entry for name, entry in matched.items()
             if any(k in name.lower() for k in ("compliance", "ethics", "cmp"))),
            None,
        )
        if cmp_entry and cmp_entry["score"] <= 0:
            logger.warning("[ScoringEngine] Collections CMP breach → RES = 0 (fatal flaw)")
            fatal_flaw = True

    if fatal_flaw:
        composite = 0.0
    elif matched:
        composite = sum(e["score"] * e["weight"] for e in matched.values())
        # Normalise in case matched weights don't sum to 1
        total_weight = sum(e["weight"] for e in matched.values())
        if total_weight > 0:
            composite = composite / total_weight
    else:
        # No pillar scores at all – fall back to raw LLM overall_score
        composite = float(llm_result.get("overall_score", 0))

    # ------------------------------------------------------------------ #
    # Silence penalty (PRD: >20% silence → subtract up to 5 pts)         #
    # ------------------------------------------------------------------ #
    silence_penalty = 0.0
    if silence_ratio is not None and silence_ratio > SILENCE_PENALTY_THRESHOLD:
        excess = silence_ratio - SILENCE_PENALTY_THRESHOLD
        # Linear scale: excess of 0.30 (30% extra silence) → full 5-pt penalty
        silence_penalty = min(SILENCE_PENALTY_MAX, (excess / 0.30) * SILENCE_PENALTY_MAX)
        silence_penalty = round(silence_penalty, 2)
        composite -= silence_penalty

    # Cap
    composite = round(max(0.0, min(100.0, composite)), 2)

    # ------------------------------------------------------------------ #
    # Build breakdown for UI display
    # ------------------------------------------------------------------ #
    pillar_breakdown = {
        name: {
            "score": entry["score"],
            "weight_pct": round(entry["weight"] * 100, 0),
            "weighted_contribution": round(entry["score"] * entry["weight"], 2),
        }
        for name, entry in matched.items()
    }

    logger.info(
        "[ScoringEngine] vertical=%s composite=%.1f label=%s fatal_flaw=%s silence_penalty=%.1f",
        v_key, composite, meta["label"], fatal_flaw, silence_penalty,
    )

    return {
        **llm_result,
        "overall_score": composite,
        "score_label": meta["label"],
        "score_name": meta["name"],
        "pillar_breakdown": pillar_breakdown,
        "fatal_flaw": fatal_flaw,
        "silence_penalty": silence_penalty,
    }
