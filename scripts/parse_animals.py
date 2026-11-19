"""Export the real public catalog. Never execute JavaScript from the source."""
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.catalog import fetch_catalog

if __name__ == "__main__":
    items = fetch_catalog()
    target = Path(__file__).resolve().parents[1] / "data" / "animals.json"
    target.parent.mkdir(exist_ok=True)
    temporary = target.with_suffix(".tmp")
    temporary.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(target)
    print(f"Saved {len(items)} animals to {target.name}")
