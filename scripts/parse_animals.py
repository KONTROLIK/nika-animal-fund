"""Refresh the source snapshot used by the exhibition prototype.

Usage: python scripts/parse_animals.py
The source is the public NIKA design page, not invented demo content.
"""
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen


SOURCE = "https://nika-design.pages.dev/sayt-2/"
ROOT = Path(__file__).resolve().parents[1]
request = Request(SOURCE, headers={"User-Agent": "Mozilla/5.0 (PET CONNECT data refresh)"})
html = urlopen(request, timeout=30).read().decode("utf-8")
pattern = re.compile(
    r'<img src="(?P<image>assets/sayt/zhivotnye/(?P<slug>[^"]+)-1\.jpg)"[^>]*alt="(?P<name>[^"]+)".*?'
    r'<a href="(?P<link>[^"]+)">(?P=name)</a>.*?'
    r'<p class="tile__where">(?P<details>[^<]+)</p>',
    re.S,
)
items = []
for match in pattern.finditer(html):
    link = match.group("link")
    if link.startswith("../"):
        link = SOURCE.rsplit("/", 2)[0] + "/" + link[3:]
    items.append({
        "id": match.group("slug"),
        "name": match.group("name"),
        "details": " ".join(match.group("details").split()),
        "image": SOURCE + match.group("image"),
        "link": link,
    })
if not items:
    raise SystemExit("No animals found; source markup may have changed")
(ROOT / "data").mkdir(exist_ok=True)
(ROOT / "data" / "animals.json").write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Saved {len(items)} animals to data/animals.json")
