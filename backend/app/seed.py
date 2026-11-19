import json
import re
from pathlib import Path
from sqlalchemy import select
from .auth import hash_password
from .catalog import fetch_catalog
from .config import get_settings
from .db import SessionLocal
from .models import Animal, User


def seed():
    settings = get_settings()
    db = SessionLocal()
    try:
        source = Path(__file__).resolve().parents[1] / "data" / "animals.json"
        if not source.exists():
            source = Path(__file__).resolve().parents[2] / "data" / "animals.json"
        try:
            records = fetch_catalog()
        except Exception:
            records = json.loads(source.read_text(encoding="utf-8")) if source.exists() else []
        for item in records:
            item_id = item.get("source_id", item.get("id"))
            details = item.get("details", "")
            match = re.match(r"(.+),\s*(мальчик|девочка)$", details)
            age, gender = match.groups() if match else (item.get("age", details), item.get("gender", "не указан"))
            animal = db.scalar(select(Animal).where(Animal.source_id == item_id))
            guardians = item.get("guardians", "Пока без опекунов")
            values = {"source_id": item_id, "name": item["name"], "age": age, "gender": gender, "guardians": guardians, "image_url": item.get("image_url", item.get("image", "")), "source_url": item.get("source_url", item.get("link", "")), "species": item.get("species", "Не указан"), "breed": item.get("breed"), "shelter": item.get("shelter", "Не указан"), "description": item.get("description"), "character": item.get("character"), "suitable_for": item.get("suitable_for"), "health": item.get("health"), "children_compatible": item.get("children_compatible"), "pets_compatible": item.get("pets_compatible"), "gallery": item.get("gallery", [])}
            if not animal:
                db.add(Animal(**values))
            else:
                for field, value in values.items():
                    if field != "source_id":
                        setattr(animal, field, value)
                animal.is_available = True
        if settings.manager_email and settings.manager_password:
            manager = db.scalar(select(User).where(User.email == settings.manager_email.lower()))
            if not manager:
                db.add(User(name=settings.manager_name, email=settings.manager_email.lower(), password_hash=hash_password(settings.manager_password), role="MANAGER"))
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
