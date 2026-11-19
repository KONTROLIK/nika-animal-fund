import json
import re
import httpx
from .config import get_settings


class AIService:
    def __init__(self):
        self.settings = get_settings()

    async def complete(self, messages: list[dict], temperature: float = 0.4) -> str | None:
        if not self.settings.ai_api_key:
            return None
        try:
            async with httpx.AsyncClient(timeout=45) as client:
                response = await client.post(
                    f"{self.settings.ai_base_url.rstrip('/')}/chat/completions",
                    headers={"Authorization": f"Bearer {self.settings.ai_api_key}"},
                    json={"model": self.settings.ai_model, "messages": messages, "temperature": temperature},
                )
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"]
        except (httpx.HTTPError, KeyError, IndexError, TypeError):
            return None

    async def analyze(self, text: str) -> dict:
        raw = await self.complete([
            {"role": "system", "content": "You extract pet adoption preferences. Return JSON only with optional keys pet_type, rhythm, home, wishes. Use null when not present. Values may be Russian."},
            {"role": "user", "content": text},
        ])
        if raw:
            match = re.search(r"\{.*\}", raw, re.S)
            if match:
                try:
                    result = json.loads(match.group(0))
                    return {key: value for key, value in result.items() if key in {"pet_type", "rhythm", "home", "wishes"} and value}
                except json.JSONDecodeError:
                    pass
        lower = text.lower()
        result = {}
        if "собак" in lower:
            result["pet_type"] = "Собака"
        elif "кош" in lower:
            result["pet_type"] = "Кошка"
        if "актив" in lower or "прогул" in lower:
            result["rhythm"] = "Активный"
        if "квартир" in lower:
            result["home"] = "Квартира"
        elif "дом" in lower:
            result["home"] = "Дом"
        return result

    async def narrate(self, text: str, preference: dict, recommendations: list[dict]) -> str:
        names = ", ".join(item["name"] for item in recommendations[:3]) or "питомцев из каталога"
        raw = await self.complete([
            {"role": "system", "content": "You are a warm Russian-speaking adoption assistant. Ask one short useful question at a time, never pressure the user, and recommend only animals from the supplied catalog. Do not invent animal facts."},
            {"role": "user", "content": f"Profile: {json.dumps(preference, ensure_ascii=False)}\nCatalog names: {names}\nUser message: {text}"},
        ], temperature=0.7)
        if raw:
            return raw.strip()
        if "pet_type" in preference:
            return f"Запомнила: {preference['pet_type'].lower()}. Расскажи, какой у тебя обычный ритм жизни — больше спокойных вечеров или длинных прогулок?"
        return "Спасибо, это важно. Расскажи немного о своём образе жизни — я подберу питомца, которому будет хорошо рядом с тобой."
