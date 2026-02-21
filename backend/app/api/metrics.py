"""
Prometheus Metrics Exporter for Audit AI.

Exposes an endpoint for scraping system health, pipeline performance,
and business KPIs.
"""
from fastapi import APIRouter, Response
from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    generate_latest,
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
    multiprocess,
)
import os

router = APIRouter()

# ---------------------------------------------------------------------------
# Metrics Definitions
# ---------------------------------------------------------------------------

# Pipeline Latency (by stage)
PIPELINE_LATENCY = Histogram(
    "audit_pipeline_stage_seconds",
    "Time spent in each pipeline stage",
    ["stage", "status"],
    buckets=(1.0, 5.0, 10.0, 30.0, 60.0, 120.0, 300.0, float("inf")),
)

# Call Processing Throughput
CALLS_PROCESSED = Counter(
    "audit_calls_processed_total",
    "Total number of calls processed",
    ["status", "vertical"],
)

# LLM Inference Duration
LLM_INFERENCE_LATENCY = Histogram(
    "audit_llm_inference_seconds",
    "Time spent in LLM scoring",
    ["backend", "status"],  # backend = vllm, ollama, rule-based
    buckets=(0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0, float("inf")),
)

# Queue Depth (Guaged in Celery worker or via Redis check)
QUEUE_DEPTH = Gauge(
    "audit_queue_depth",
    "Number of calls currently in the processing queue",
)


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.get("/metrics")
def get_metrics():
    """Returns the current metrics in Prometheus format."""
    # Handle multiprocess mode (for Gunicorn/Uvicorn workers)
    if os.environ.get("PROMETHEUS_MULTIPROC_DIR"):
        registry = CollectorRegistry()
        multiprocess.MultiProcessCollector(registry)
        data = generate_latest(registry)
    else:
        data = generate_latest()
        
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
