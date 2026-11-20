from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(40))
    city: Mapped[str | None] = mapped_column(String(120))
    postal_code: Mapped[str | None] = mapped_column(String(20))
    address: Mapped[str | None] = mapped_column(String(300))
    contact_method: Mapped[str | None] = mapped_column(String(40))
    avatar_url: Mapped[str | None] = mapped_column(Text)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="USER", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    preference: Mapped["Preference | None"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    portrait: Mapped["OwnerPortrait | None"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    conversations: Mapped[list["Conversation"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Preference(Base):
    __tablename__ = "preferences"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    pet_type: Mapped[str | None] = mapped_column(String(40))
    rhythm: Mapped[str | None] = mapped_column(String(80))
    home: Mapped[str | None] = mapped_column(String(80))
    wishes: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    user: Mapped[User] = relationship(back_populates="preference")


class PreferenceChange(Base):
    __tablename__ = "preference_changes"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    field: Mapped[str] = mapped_column(String(40))
    old_value: Mapped[str | None] = mapped_column(Text)
    new_value: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OwnerPortrait(Base):
    __tablename__ = "owner_portraits"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    facts: Mapped[dict] = mapped_column(JSON, default=dict)
    answers: Mapped[list] = mapped_column(JSON, default=list)
    covered_topics: Mapped[list] = mapped_column(JSON, default=list)
    summary: Mapped[str | None] = mapped_column(Text)
    question_index: Mapped[int] = mapped_column(Integer, default=0)
    answer_count: Mapped[int] = mapped_column(Integer, default=0)
    completeness: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    user: Mapped[User] = relationship(back_populates="portrait")


class AISettingsRecord(Base):
    __tablename__ = "ai_settings"
    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    encrypted_api_key: Mapped[str | None] = mapped_column(Text)
    base_url: Mapped[str] = mapped_column(String(300), default="https://anymodel.org/v1")
    narrator_model: Mapped[str] = mapped_column(String(160), default="am/nemotron-3-ultra-550b-a55b")
    expert_model: Mapped[str] = mapped_column(String(160), default="am/nemotron-3-ultra-550b-a55b")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Conversation(Base):
    __tablename__ = "conversations"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(160), default="Первое знакомство")
    interview_complete: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    user: Mapped[User] = relationship(back_populates="conversations")
    messages: Mapped[list["Message"]] = relationship(back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    conversation: Mapped[Conversation] = relationship(back_populates="messages")


class Animal(Base):
    __tablename__ = "animals"
    id: Mapped[int] = mapped_column(primary_key=True)
    source_id: Mapped[str] = mapped_column(String(120), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    age: Mapped[str] = mapped_column(String(80))
    gender: Mapped[str] = mapped_column(String(40))
    guardians: Mapped[str] = mapped_column(String(80))
    species: Mapped[str] = mapped_column(String(40), default="Не указан")
    breed: Mapped[str | None] = mapped_column(String(120))
    shelter: Mapped[str] = mapped_column(String(120), default="Не указан")
    description: Mapped[str | None] = mapped_column(Text)
    character: Mapped[str | None] = mapped_column(Text)
    suitable_for: Mapped[str | None] = mapped_column(Text)
    health: Mapped[str | None] = mapped_column(Text)
    children_compatible: Mapped[bool | None] = mapped_column(Boolean)
    pets_compatible: Mapped[bool | None] = mapped_column(Boolean)
    gallery: Mapped[list[str]] = mapped_column(JSON, default=list)
    image_url: Mapped[str] = mapped_column(String(500))
    source_url: Mapped[str] = mapped_column(String(500))
    source_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, index=True)


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "animal_id", name="uq_favorite_user_animal"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    animal_id: Mapped[int] = mapped_column(ForeignKey("animals.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Swipe(Base):
    __tablename__ = "swipes"
    __table_args__ = (UniqueConstraint("user_id", "animal_id", name="uq_swipe_user_animal"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    animal_id: Mapped[int] = mapped_column(ForeignKey("animals.id", ondelete="CASCADE"), index=True)
    decision: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
