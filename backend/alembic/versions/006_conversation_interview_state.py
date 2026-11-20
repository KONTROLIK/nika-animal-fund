"""track interview completion per conversation"""
from alembic import op
import sqlalchemy as sa


revision = "006_conversation_interview_state"
down_revision = "005_user_profile"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("conversations", sa.Column("interview_complete", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.execute(sa.text("""
        UPDATE conversations
        SET interview_complete = TRUE
        WHERE id IN (
            SELECT conversation_id
            FROM messages
            WHERE role = 'user'
            GROUP BY conversation_id
            HAVING COUNT(*) >= 15
        )
    """))
    op.alter_column("conversations", "interview_complete", server_default=None)


def downgrade():
    op.drop_column("conversations", "interview_complete")
