import json
import re
import httpx
from datetime import datetime, timezone
from .config import get_settings


PORTRAIT_TOPICS = [
    ("routine", "Обычный ритм", "Как обычно проходит твой будний день и что меняется на выходных?"),
    ("time", "Время и отсутствие дома", "Сколько времени питомец обычно будет проводить один? Что поможет тебе заботиться о нём в загруженные дни?"),
    ("home", "Дом и пространство", "Расскажи о доме: квартира или дом, есть ли безопасное место для питомца, двор, лестницы или другие важные особенности?"),
    ("household", "Люди рядом", "Кто живёт вместе с тобой? Есть ли дети, пожилые люди или близкие, чьё мнение важно для решения?"),
    ("animals", "Другие животные", "Есть ли у тебя сейчас другие животные? Как они обычно реагируют на новых соседей?"),
    ("experience", "Опыт заботы", "Был ли у тебя раньше питомец? Что в этом опыте было хорошего, а что оказалось сложным?"),
    ("temperament", "Характер друга", "Какой характер тебе ближе: спокойный и осторожный, общительный и ласковый или энергичный и самостоятельный?"),
    ("activity", "Совместная активность", "Какие занятия ты действительно готов делать вместе: прогулки, игры, обучение, спокойные вечера?"),
    ("care", "Уход и быт", "К каким регулярным обязанностям ты готов: уход, обучение, поездки к ветеринару, специальный режим?"),
    ("health", "Здоровье и особенности", "Есть ли аллергии, ограничения или медицинские особенности в семье, которые важно учесть заранее?"),
    ("budget", "Расходы", "Как ты планируешь расходы на корм, уход и ветеринарную помощь? Можно ответить примерно или пропустить."),
    ("motivation", "Мотивация", "Почему сейчас тебе хочется взять питомца? Что ты особенно надеешься дать ему?"),
    ("expectations", "Ожидания", "Каким ты представляешь первые месяцы вместе? Что будет для тебя признаком, что вы привыкаете друг к другу?"),
    ("boundaries", "Границы и сложности", "С какими особенностями поведения ты точно не готов столкнуться, а к чему готов относиться терпеливо?"),
    ("support", "Поддержка", "Кто сможет помочь тебе в форс-мажорной ситуации, отпуске или периоде адаптации питомца?"),
]


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

    async def analyze_portrait(self, text: str, topic_id: str, portrait: dict) -> dict:
        topic = next((item for item in PORTRAIT_TOPICS if item[0] == topic_id), PORTRAIT_TOPICS[0])
        raw = await self.complete([
            {"role": "system", "content": "You are a careful adoption intake analyst. Extract only facts explicitly stated by the user. Return JSON only: {preferences:{pet_type,rhythm,home,wishes}, facts:{}, topic_complete:boolean, summary:string}. Never infer sensitive facts. Keep facts concise in Russian."},
            {"role": "user", "content": json.dumps({"current_topic": topic[1], "question": topic[2], "previous_portrait": portrait, "answer": text}, ensure_ascii=False)},
        ])
        if raw:
            match = re.search(r"\{.*\}", raw, re.S)
            if match:
                try:
                    result = json.loads(match.group(0))
                    return {
                        "preferences": result.get("preferences") or {},
                        "facts": result.get("facts") or {},
                        "topic_complete": bool(result.get("topic_complete", True)),
                        "summary": result.get("summary") or "",
                    }
                except json.JSONDecodeError:
                    pass
        lower = text.lower()
        preferences = {}
        if "собак" in lower:
            preferences["pet_type"] = "Собака"
        elif "кош" in lower:
            preferences["pet_type"] = "Кошка"
        if "актив" in lower or "прогул" in lower:
            preferences["rhythm"] = "Активный"
        if "квартир" in lower:
            preferences["home"] = "Квартира"
        elif "дом" in lower:
            preferences["home"] = "Дом"
        return {"preferences": preferences, "facts": {topic_id: text.strip()}, "topic_complete": True, "summary": ""}

    async def narrate(self, text: str, preference: dict, recommendations: list[dict], portrait: dict | None = None, next_topic: tuple | None = None) -> str:
        names = ", ".join(item["name"] for item in recommendations[:3]) or "питомцев из каталога"
        next_question = next_topic[2] if next_topic else "Хочешь посмотреть первые совпадения?"
        raw = await self.complete([
            {"role": "system", "content": "You are a warm Russian-speaking adoption assistant. A user is completing a thoughtful adoption interview. Acknowledge their answer briefly, then ask exactly one next question. Ask deeper but respectful questions, never pressure the user, and never expose the private portrait or invent animal facts."},
            {"role": "user", "content": json.dumps({"visible_preferences": preference, "private_portrait": portrait or {}, "catalog_names": names, "user_message": text, "next_question": next_question}, ensure_ascii=False)},
        ], temperature=0.7)
        if raw:
            return raw.strip()
        return f"Спасибо, это важно. {next_question}"
