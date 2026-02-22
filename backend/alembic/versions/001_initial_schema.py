"""Initial schema alignment with models.

Revision ID: 001_phase2
Revises:
Create Date: 2026-02-22
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001_phase2"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Enums ─────────────────────────────────────────────────────────────
    # Create enums explicitly with "IF NOT EXISTS" logic
    op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN CREATE TYPE userrole AS ENUM ('agent', 'manager', 'cxo', 'admin'); END IF; END $$;")
    op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'callstatus') THEN CREATE TYPE callstatus AS ENUM ('queued', 'processing', 'completed', 'failed'); END IF; END $$;")
    op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pipelinestage') THEN CREATE TYPE pipelinestage AS ENUM ('normalize', 'vad', 'diarize', 'transcribe', 'score'); END IF; END $$;")
    op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'jobstatus') THEN CREATE TYPE jobstatus AS ENUM ('pending', 'running', 'completed', 'failed'); END IF; END $$;")

    # ── clients ───────────────────────────────────────────────────────────
    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_name", sa.String(length=255), nullable=False),
        sa.Column("api_key_hash", sa.String(length=255), nullable=True),
        sa.Column("retention_days", sa.Integer(), server_default="365"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_clients_id", "clients", ["id"])

    # ── users ─────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("role", postgresql.ENUM("agent", "manager", "cxo", "admin", name="userrole", create_type=False), nullable=False),
        sa.Column("department", sa.String(length=100), nullable=True),
        sa.Column("client_id", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_login", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"])

    # ── scoring_templates ─────────────────────────────────────────────────
    op.create_table(
        "scoring_templates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("vertical", sa.String(length=50), nullable=False, server_default="Sales"),
        sa.Column("system_prompt", sa.Text(), nullable=False),
        sa.Column("json_schema", postgresql.JSONB(), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1"),
        sa.Column("is_active", sa.Integer(), server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_scoring_templates_id", "scoring_templates", ["id"])

    # ── calls ─────────────────────────────────────────────────────────────
    op.create_table(
        "calls",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("template_id", sa.Integer(), nullable=False),
        sa.Column("batch_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("s3_path", sa.String(length=500), nullable=False),
        sa.Column("status", postgresql.ENUM("queued", "processing", "completed", "failed", name="callstatus", create_type=False), nullable=False, server_default="queued"),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.String(length=1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["template_id"], ["scoring_templates.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_calls_id", "calls", ["id"])
    op.create_index("ix_calls_user_id", "calls", ["user_id"])
    op.create_index("ix_calls_batch_id", "calls", ["batch_id"])

    # ── transcripts ───────────────────────────────────────────────────────
    op.create_table(
        "transcripts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("call_id", sa.Integer(), nullable=False),
        sa.Column("speaker_label", sa.String(length=50), nullable=False),
        sa.Column("start_time", sa.Float(), nullable=False),
        sa.Column("end_time", sa.Float(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["call_id"], ["calls.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_transcripts_id", "transcripts", ["id"])
    op.create_index("ix_transcripts_call_id", "transcripts", ["call_id"])

    # ── evaluation_results ────────────────────────────────────────────────
    op.create_table(
        "evaluation_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("call_id", sa.Integer(), nullable=False),
        sa.Column("overall_score", sa.Float(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("compliance_flags", postgresql.JSONB(), nullable=True, server_default="{}"),
        sa.Column("pillar_scores", postgresql.JSONB(), nullable=True, server_default="{}"),
        sa.Column("recommendations", postgresql.JSONB(), nullable=True, server_default="[]"),
        sa.Column("full_json_output", postgresql.JSONB(), nullable=True, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["call_id"], ["calls.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("call_id"),
    )
    op.create_index("ix_evaluation_results_id", "evaluation_results", ["id"])
    op.create_index("ix_evaluation_results_call_id", "evaluation_results", ["call_id"])

    # ── audit_logs ────────────────────────────────────────────────────────
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("action_type", sa.String(length=100), nullable=False),
        sa.Column("resource_id", sa.String(length=100), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("details", sa.String(length=1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_logs_id", "audit_logs", ["id"])
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])

    # ── batches ───────────────────────────────────────────────────────────
    op.create_table(
        "batches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("batch_uuid", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("num_calls", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_batches_id", "batches", ["id"])
    op.create_index("ix_batches_batch_uuid", "batches", ["batch_uuid"], unique=True)

    # ── media_files ───────────────────────────────────────────────────────
    op.create_table(
        "media_files",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("call_id", sa.Integer(), nullable=False),
        sa.Column("s3_key", sa.String(length=500), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=True),
        sa.Column("file_size_bytes", sa.Integer(), nullable=True),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("mime_type", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["call_id"], ["calls.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_media_files_id", "media_files", ["id"])
    op.create_index("ix_media_files_call_id", "media_files", ["call_id"])

    # ── processing_jobs ───────────────────────────────────────────────────
    op.create_table(
        "processing_jobs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("call_id", sa.Integer(), nullable=False),
        sa.Column("stage", postgresql.ENUM("normalize", "vad", "diarize", "transcribe", "score", name="pipelinestage", create_type=False), nullable=False),
        sa.Column("status", postgresql.ENUM("pending", "running", "completed", "failed", name="jobstatus", create_type=False), nullable=False, server_default="pending"),
        sa.Column("error_message", sa.String(length=1000), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["call_id"], ["calls.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_processing_jobs_id", "processing_jobs", ["id"])
    op.create_index("ix_processing_jobs_call_id", "processing_jobs", ["call_id"])


def downgrade() -> None:
    # Drop in reverse order of creation
    op.drop_table("processing_jobs")
    op.drop_table("media_files")
    op.drop_table("batches")
    op.drop_table("audit_logs")
    op.drop_table("evaluation_results")
    op.drop_table("transcripts")
    op.drop_table("calls")
    op.drop_table("scoring_templates")
    op.drop_table("users")
    op.drop_table("clients")

    # Drop enums
    op.execute("DROP TYPE IF EXISTS jobstatus")
    op.execute("DROP TYPE IF EXISTS pipelinestage")
    op.execute("DROP TYPE IF EXISTS callstatus")
    op.execute("DROP TYPE IF EXISTS userrole")
