"""add source details to animals"""
from alembic import op
import sqlalchemy as sa

revision = "002_animal_details"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade():
    for name, column in [
        ("species", sa.String(40)), ("breed", sa.String(120)), ("shelter", sa.String(120)),
        ("description", sa.Text()), ("character", sa.Text()), ("suitable_for", sa.Text()),
        ("health", sa.Text()), ("children_compatible", sa.Boolean()), ("pets_compatible", sa.Boolean()),
        ("gallery", sa.JSON()),
    ]:
        op.add_column("animals", sa.Column(name, column, nullable=True))
    op.execute("UPDATE animals SET species = 'Не указан', shelter = 'Не указан' WHERE species IS NULL")


def downgrade():
    for name in ("gallery", "pets_compatible", "children_compatible", "health", "suitable_for", "character", "description", "shelter", "breed", "species"):
        op.drop_column("animals", name)
