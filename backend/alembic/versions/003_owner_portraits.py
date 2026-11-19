"""store the private, detailed owner portrait"""
from alembic import op
import sqlalchemy as sa

revision = "003_owner_portraits"
down_revision = "002_animal_details"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "owner_portraits",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("facts", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("answers", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("covered_topics", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("summary", sa.Text()),
        sa.Column("question_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("answer_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completeness", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_owner_portraits_user_id", "owner_portraits", ["user_id"])


def downgrade():
    op.drop_table("owner_portraits")
