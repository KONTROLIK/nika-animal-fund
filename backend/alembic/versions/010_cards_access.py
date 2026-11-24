"""allow managers to open pet cards before interview completion"""
from alembic import op
import sqlalchemy as sa


revision = "010_cards_access"
down_revision = "009_deepseek_flash"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("cards_access", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade():
    op.drop_column("users", "cards_access")
