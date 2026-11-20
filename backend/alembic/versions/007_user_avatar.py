"""add profile avatar"""
from alembic import op
import sqlalchemy as sa


revision = "007_user_avatar"
down_revision = "006_conversation_interview_state"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("avatar_url", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("users", "avatar_url")
