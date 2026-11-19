"""initial schema"""
from alembic import op
import sqlalchemy as sa

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("users", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("name", sa.String(120), nullable=False), sa.Column("email", sa.String(320), nullable=False), sa.Column("password_hash", sa.String(255), nullable=False), sa.Column("role", sa.String(20), nullable=False, server_default="USER"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.UniqueConstraint("email"))
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_role", "users", ["role"])
    op.create_table("preferences", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("pet_type", sa.String(40)), sa.Column("rhythm", sa.String(80)), sa.Column("home", sa.String(80)), sa.Column("wishes", sa.Text()), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.UniqueConstraint("user_id"))
    op.create_table("preference_changes", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("field", sa.String(40), nullable=False), sa.Column("old_value", sa.Text()), sa.Column("new_value", sa.Text()), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_index("ix_preference_changes_user_id", "preference_changes", ["user_id"])
    op.create_table("conversations", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("title", sa.String(160), nullable=False, server_default="Первое знакомство"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_index("ix_conversations_user_id", "conversations", ["user_id"])
    op.create_table("messages", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False), sa.Column("role", sa.String(20), nullable=False), sa.Column("content", sa.Text(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"])
    op.create_table("animals", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("source_id", sa.String(120), nullable=False), sa.Column("name", sa.String(120), nullable=False), sa.Column("age", sa.String(80), nullable=False), sa.Column("gender", sa.String(40), nullable=False), sa.Column("guardians", sa.String(80), nullable=False), sa.Column("image_url", sa.String(500), nullable=False), sa.Column("source_url", sa.String(500), nullable=False), sa.Column("source_updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("is_available", sa.Boolean(), nullable=False, server_default=sa.true()), sa.UniqueConstraint("source_id"))
    op.create_index("ix_animals_is_available", "animals", ["is_available"])
    op.create_table("favorites", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("animal_id", sa.Integer(), sa.ForeignKey("animals.id", ondelete="CASCADE"), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.UniqueConstraint("user_id", "animal_id", name="uq_favorite_user_animal"))
    op.create_index("ix_favorites_user_id", "favorites", ["user_id"])
    op.create_index("ix_favorites_animal_id", "favorites", ["animal_id"])
    op.create_table("swipes", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("animal_id", sa.Integer(), sa.ForeignKey("animals.id", ondelete="CASCADE"), nullable=False), sa.Column("decision", sa.String(20), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.UniqueConstraint("user_id", "animal_id", name="uq_swipe_user_animal"))
    op.create_index("ix_swipes_user_id", "swipes", ["user_id"])
    op.create_index("ix_swipes_animal_id", "swipes", ["animal_id"])


def downgrade():
    for table in ("swipes", "favorites", "animals", "messages", "conversations", "preference_changes", "preferences", "users"):
        op.drop_table(table)
