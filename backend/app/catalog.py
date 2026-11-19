"""Read the public source's data literal, without running scripts or inventing facts."""
from datetime import datetime, timezone
import re

from bs4 import BeautifulSoup
import httpx
import json5
import pandas as pd

SOURCE = "https://nika-design.pages.dev/podopechnye/"


def parse_catalog(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    scripts = "\n".join(script.get_text() for script in soup.find_all("script"))
    match = re.search(r"\bvar A\s*=\s*(\[.*?\n\s*\]);", scripts, re.S)
    if not match:
        raise ValueError("Catalog data not found: source format changed")
    records = json5.loads(match.group(1))
    if not isinstance(records, list) or len(records) < 10:
        raise ValueError("Incomplete catalog; keeping the previous version")
    items = []
    for record in records:
        source_id = record["s"]
        if not re.fullmatch(r"[a-z0-9-]+-\d+", source_id) or record["sp"] not in {"dog", "cat"}:
            raise ValueError("Invalid source record")
        gallery = record.get("gal", [])
        if not gallery or any(not re.fullmatch(r"[a-z0-9-]+", image) for image in gallery):
            raise ValueError("Invalid source gallery")
        count = record.get("team")
        items.append({
            "source_id": source_id, "name": record["n"], "age": record["age"],
            "age_months": record.get("mo"),
            "gender": "девочка" if record["f"] else "мальчик",
            "species": "Собака" if record["sp"] == "dog" else "Кошка",
            "breed": record.get("breed"),
            "shelter": {"nika": "Приют «НИКА»", "mn": "Центр «Мокрый нос»"}[record["sh"]],
            "guardians": f"{count} из 5 опекунов" if count else "Пока без опекунов" if count == 0 else "Уточните в приюте",
            "description": "\n\n".join(record.get("t", [])),
            "character": "\n\n".join(record.get("c", [])),
            "suitable_for": "\n\n".join(record.get("w", [])),
            "health": record.get("ill"),
            "children_compatible": True if record.get("kids") == 1 else None,
            "pets_compatible": True if record.get("pet2") == 1 else None,
            "gallery": [f"{SOURCE}assets/sayt/zhivotnye/{name}.jpg" for name in gallery],
            "image_url": f"{SOURCE}assets/sayt/zhivotnye/{gallery[0]}.jpg",
            "source_url": f"{SOURCE}#zhivotnoe/{source_id}",
            # 'closed' in this source means guardianship is closed, not adoption.
            "is_available": True,
            "source_updated_at": datetime.now(timezone.utc).isoformat(),
        })
    frame = pd.DataFrame(items)
    if frame["source_id"].duplicated().any():
        raise ValueError("Duplicate source IDs")
    return items


def fetch_catalog() -> list[dict]:
    response = httpx.get(SOURCE, headers={"User-Agent": "PETConnect/1.0 public catalog import"}, timeout=30, follow_redirects=True)
    response.raise_for_status()
    return parse_catalog(response.text)
