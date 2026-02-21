"""
Alembic migration: 002_add_mfa_columns
Adds MFA fields to the users table.
"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("totp_secret_enc", sa.String(512), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("mfa_enabled", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade():
    op.drop_column("users", "mfa_enabled")
    op.drop_column("users", "totp_secret_enc")
