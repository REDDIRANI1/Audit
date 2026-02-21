"""
Synchronous SQLAlchemy session factory for Celery workers.

Celery tasks cannot use asyncio, so we need a sync session here.
"""
import os
from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# Build sync URL from env (replace asyncpg with psycopg2)
_raw_url = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://auditai:auditai_secret@localhost:5432/auditai"
)
SYNC_DATABASE_URL = _raw_url.replace("postgresql+asyncpg://", "postgresql://")

engine = create_engine(
    SYNC_DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=True, autocommit=False)


@contextmanager
def get_sync_db() -> Session:
    """Context manager yielding a sync DB session."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
