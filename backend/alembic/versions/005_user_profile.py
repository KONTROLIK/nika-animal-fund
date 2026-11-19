"""add formal account profile fields"""
from alembic import op
import sqlalchemy as sa

revision = "005_user_profile"
down_revision = "004_ai_settings"
branch_labels = None
depends_on = None


def upgrade():
    for name, column in [
        ("phone", sa.String(40)),
        ("city", sa.String(120)),
        ("postal_code", sa.String(20)),
        ("address", sa.String(300)),
        ("contact_method", sa.String(40)),
    ]:
        op.add_column("users", sa.Column(name, column, nullable=True))


def downgrade():
    for name in ("contact_method", "address", "postal_code", "city", "phone"):
        op.drop_column("users", name)
