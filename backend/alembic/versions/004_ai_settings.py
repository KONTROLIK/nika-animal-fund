"""store encrypted operator AI configuration"""
from alembic import op
import sqlalchemy as sa

revision = "004_ai_settings"
down_revision = "003_owner_portraits"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "ai_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("encrypted_api_key", sa.Text()),
        sa.Column("base_url", sa.String(300), nullable=False, server_default="https://anymodel.org/v1"),
        sa.Column("narrator_model", sa.String(160), nullable=False, server_default="am/nemotron-3-ultra-550b-a55b"),
        sa.Column("expert_model", sa.String(160), nullable=False, server_default="am/nemotron-3-ultra-550b-a55b"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade():
    op.drop_table("ai_settings")
