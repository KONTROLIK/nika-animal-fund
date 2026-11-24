"""store provider usage and configurable model pricing"""
from alembic import op
import sqlalchemy as sa


revision = "008_ai_usage"
down_revision = "007_user_avatar"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "ai_model_pricing",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("model", sa.String(length=160), nullable=False, unique=True),
        sa.Column("input_usd_per_million", sa.Numeric(20, 10), nullable=False, server_default="0"),
        sa.Column("output_usd_per_million", sa.Numeric(20, 10), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_ai_model_pricing_model", "ai_model_pricing", ["model"], unique=True)
    op.create_table(
        "ai_usage_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("agent", sa.String(length=40), nullable=False),
        sa.Column("model", sa.String(length=160), nullable=False),
        sa.Column("input_tokens", sa.Integer(), nullable=True),
        sa.Column("output_tokens", sa.Integer(), nullable=True),
        sa.Column("total_tokens", sa.Integer(), nullable=True),
        sa.Column("cost_usd", sa.Numeric(20, 10), nullable=True),
        sa.Column("usage_available", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("pricing_available", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="success"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    for column in ("user_id", "conversation_id", "agent", "model", "created_at"):
        op.create_index(f"ix_ai_usage_logs_{column}", "ai_usage_logs", [column])


def downgrade():
    for column in ("created_at", "model", "agent", "conversation_id", "user_id"):
        op.drop_index(f"ix_ai_usage_logs_{column}", table_name="ai_usage_logs")
    op.drop_table("ai_usage_logs")
    op.drop_index("ix_ai_model_pricing_model", table_name="ai_model_pricing")
    op.drop_table("ai_model_pricing")
