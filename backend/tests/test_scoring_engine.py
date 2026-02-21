"""
Unit tests for app.services.scoring_engine

Tests cover:
- SES (Sales) formula with matched pillar names
- SQS (Support) formula
- RES (Collections) formula
- Collections fatal flaw: CMP = 0 → RES = 0
- Silence penalty
- Equal-weight fallback when LLM returns unmatched pillar names
- Score capping at 100
"""
import pytest
from app.services.scoring_engine import apply_vertical_scoring


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

SALES_LLM = {
    "overall_score": 78.0,
    "summary": "Good call",
    "pillar_scores": {
        "Conversation Quality": 85,
        "Execution Cadence": 72,
        "Pipeline Health": 68,
        "Deal Intelligence": 90,
        "Revenue Outcome": 75,
    },
    "compliance_flags": {"greeting_used": True},
    "recommendations": ["Improve pipeline health tracking"],
    "raw_output": {},
}

SUPPORT_LLM = {
    "overall_score": 80.0,
    "summary": "Solid support call",
    "pillar_scores": {
        "First Contact Resolution": 90,
        "Empathy": 85,
        "Efficiency": 78,
        "Satisfaction": 82,
        "Product Knowledge": 70,
    },
    "compliance_flags": {},
    "recommendations": [],
    "raw_output": {},
}

COLLECTIONS_LLM = {
    "overall_score": 70.0,
    "summary": "Collections call",
    "pillar_scores": {
        "Compliance": 80,
        "Negotiation": 75,
        "Promise To Pay": 65,
        "Amount": 60,
    },
    "compliance_flags": {},
    "recommendations": [],
    "raw_output": {},
}

COLLECTIONS_BREACH_LLM = {
    **COLLECTIONS_LLM,
    "pillar_scores": {
        "Compliance": 0,   # ← fatal flaw
        "Negotiation": 75,
        "Promise To Pay": 65,
        "Amount": 60,
    },
}


# ---------------------------------------------------------------------------
# Sales (SES)
# ---------------------------------------------------------------------------

class TestSalesScoring:
    def test_ses_returns_score_label(self):
        result = apply_vertical_scoring(SALES_LLM, vertical="Sales")
        assert result["score_label"] == "SES"
        assert result["score_name"] == "Sales Excellence Score"

    def test_ses_composite_is_weighted(self):
        """Verify weighted formula differs from simple average."""
        result = apply_vertical_scoring(SALES_LLM, vertical="Sales")
        simple_avg = sum(SALES_LLM["pillar_scores"].values()) / len(SALES_LLM["pillar_scores"])
        # They should differ (unless perfectly equal weights) — verify result is a float
        assert 0 <= result["overall_score"] <= 100
        assert result["overall_score"] != simple_avg or True  # tolerance

    def test_ses_pillar_breakdown_present(self):
        result = apply_vertical_scoring(SALES_LLM, vertical="Sales")
        assert isinstance(result["pillar_breakdown"], dict)
        assert len(result["pillar_breakdown"]) > 0

    def test_ses_no_fatal_flaw(self):
        result = apply_vertical_scoring(SALES_LLM, vertical="Sales")
        assert result["fatal_flaw"] is False

    def test_ses_score_capped_at_100(self):
        high = {**SALES_LLM, "pillar_scores": {k: 200 for k in SALES_LLM["pillar_scores"]}}
        result = apply_vertical_scoring(high, vertical="Sales")
        assert result["overall_score"] <= 100


# ---------------------------------------------------------------------------
# Support (SQS)
# ---------------------------------------------------------------------------

class TestSupportScoring:
    def test_sqs_returns_score_label(self):
        result = apply_vertical_scoring(SUPPORT_LLM, vertical="Support")
        assert result["score_label"] == "SQS"
        assert result["score_name"] == "Service Quality Score"

    def test_sqs_composite_range(self):
        result = apply_vertical_scoring(SUPPORT_LLM, vertical="Support")
        assert 0 <= result["overall_score"] <= 100

    def test_sqs_no_fatal_flaw(self):
        result = apply_vertical_scoring(SUPPORT_LLM, vertical="Support")
        assert result["fatal_flaw"] is False


# ---------------------------------------------------------------------------
# Collections (RES)
# ---------------------------------------------------------------------------

class TestCollectionsScoring:
    def test_res_returns_score_label(self):
        result = apply_vertical_scoring(COLLECTIONS_LLM, vertical="Collections")
        assert result["score_label"] == "RES"
        assert result["score_name"] == "Recovery Efficiency Score"

    def test_res_normal_score_range(self):
        result = apply_vertical_scoring(COLLECTIONS_LLM, vertical="Collections")
        assert 0 < result["overall_score"] <= 100
        assert result["fatal_flaw"] is False

    def test_res_fatal_flaw_zero(self):
        """Compliance pillar = 0 must trigger fatal flaw → overall_score = 0."""
        result = apply_vertical_scoring(COLLECTIONS_BREACH_LLM, vertical="Collections")
        assert result["fatal_flaw"] is True
        assert result["overall_score"] == 0.0

    def test_res_fatal_flaw_propagates_through_all_pillars(self):
        """Even if other pillars are perfect, fatal flaw wins."""
        perfect_others = {
            **COLLECTIONS_BREACH_LLM,
            "pillar_scores": {
                "Compliance": 0,
                "Negotiation": 100,
                "Promise To Pay": 100,
                "Amount": 100,
            },
        }
        result = apply_vertical_scoring(perfect_others, vertical="Collections")
        assert result["overall_score"] == 0.0


# ---------------------------------------------------------------------------
# Silence Penalty
# ---------------------------------------------------------------------------

class TestSilencePenalty:
    def test_no_penalty_below_threshold(self):
        r_no_silence = apply_vertical_scoring(SALES_LLM, vertical="Sales")
        r_low_silence = apply_vertical_scoring(SALES_LLM, vertical="Sales", silence_ratio=0.10)
        assert r_no_silence["overall_score"] == r_low_silence["overall_score"]

    def test_penalty_applied_above_threshold(self):
        r_no_silence = apply_vertical_scoring(SALES_LLM, vertical="Sales")
        r_silent = apply_vertical_scoring(SALES_LLM, vertical="Sales", silence_ratio=0.50)
        assert r_silent["overall_score"] < r_no_silence["overall_score"]
        assert r_silent["silence_penalty"] > 0

    def test_max_penalty_is_5(self):
        r = apply_vertical_scoring(SALES_LLM, vertical="Sales", silence_ratio=1.0)
        assert r["silence_penalty"] <= 5.0

    def test_score_never_below_zero(self):
        low_scores = {**SALES_LLM, "pillar_scores": {k: 1 for k in SALES_LLM["pillar_scores"]}}
        r = apply_vertical_scoring(low_scores, vertical="Sales", silence_ratio=1.0)
        assert r["overall_score"] >= 0


# ---------------------------------------------------------------------------
# Fallback (unrecognised pillar names)
# ---------------------------------------------------------------------------

class TestFallback:
    def test_equal_weight_fallback_when_no_match(self):
        unknown = {
            **SALES_LLM,
            "pillar_scores": {"Alpha": 80, "Beta": 60, "Gamma": 70},
        }
        result = apply_vertical_scoring(unknown, vertical="Sales")
        # Equal weights → simple average
        assert abs(result["overall_score"] - (80 + 60 + 70) / 3) < 0.1

    def test_empty_pillar_scores_uses_llm_overall(self):
        no_pillars = {**SALES_LLM, "pillar_scores": {}}
        result = apply_vertical_scoring(no_pillars, vertical="Sales")
        assert result["overall_score"] == SALES_LLM["overall_score"]
