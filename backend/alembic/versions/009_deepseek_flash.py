"""switch the default AI provider to DeepSeek V4.1 Flash"""
from alembic import op
import sqlalchemy as sa


revision = "009_deepseek_flash"
down_revision = "008_ai_usage"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(sa.text("""
        UPDATE conversations
        SET interview_complete = TRUE
        WHERE interview_complete = FALSE
          AND id IN (
              SELECT conversation_id
              FROM messages
              WHERE role = 'user'
              GROUP BY conversation_id
              HAVING COUNT(*) >= 8
          )
    """))
    op.execute(sa.text("""
        UPDATE ai_settings
        SET base_url = CASE WHEN base_url = 'https://anymodel.org/v1' THEN 'https://api.deepseek.com' ELSE base_url END,
            narrator_model = CASE WHEN narrator_model = 'am/nemotron-3-ultra-550b-a55b' THEN 'deepseek-flash' ELSE narrator_model END,
            expert_model = CASE WHEN expert_model = 'am/nemotron-3-ultra-550b-a55b' THEN 'deepseek-flash' ELSE expert_model END
        WHERE base_url = 'https://anymodel.org/v1'
           OR narrator_model = 'am/nemotron-3-ultra-550b-a55b'
           OR expert_model = 'am/nemotron-3-ultra-550b-a55b'
    """))


def downgrade():
    op.execute(sa.text("""
        UPDATE ai_settings
        SET base_url = 'https://anymodel.org/v1',
            narrator_model = 'am/nemotron-3-ultra-550b-a55b',
            expert_model = 'am/nemotron-3-ultra-550b-a55b'
        WHERE base_url = 'https://api.deepseek.com'
          AND narrator_model = 'deepseek-flash'
          AND expert_model = 'deepseek-flash'
    """))
