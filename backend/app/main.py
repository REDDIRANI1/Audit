from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import auth, upload, calls, templates, dashboard, websocket


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    # Startup: ensure S3 bucket exists
    from app.utils.s3 import ensure_bucket_exists
    try:
        ensure_bucket_exists()
    except Exception:
        pass  # MinIO may not be ready yet in dev
    yield
    # Shutdown: cleanup


app = FastAPI(
    title="Audit AI",
    description="Enterprise speech-intelligence platform for call QA and compliance audits",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(calls.router)
app.include_router(templates.router)
app.include_router(dashboard.router)
app.include_router(websocket.router)


@app.get("/")
async def root():
    return {"service": "Audit AI API", "version": "1.0.0", "status": "healthy"}


@app.get("/health")
async def health():
    return {"status": "ok"}
