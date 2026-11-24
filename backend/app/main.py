from datetime import date, datetime, timedelta, timezone
from fastapi import Depends, FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session
from .ai import AIService, PORTRAIT_TOPICS
from .auth import create_token, current_user, hash_password, manager_only, verify_password
from .config import get_settings
from .db import get_db
from .models import AIModelPricing, AIUsageLog, Animal, Conversation, Favorite, Message, OwnerPortrait, Preference, PreferenceChange, Swipe, User
from .realtime import events
from .schemas import AIPricingIn, AIPricingOut, AISettingsIn, AISettingsOut, AIAnalyticsOut, AccountUpdateIn, AnimalOut, ChatIn, ChatOut, ConversationOut, LoginIn, ManagerUserOut, MessageOut, PreferenceIn, PreferenceOut, PortraitStatusOut, PortraitTopic, RegisterIn, SwipeIn, TokenOut, UserOut
from .secrets import encrypt_secret
from .models import AISettingsRecord


app = FastAPI(title="PET CONNECT API", version="1.0.0")
settings = get_settings()
app.add_middleware(CORSMiddleware, allow_origins=settings.origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
ai = AIService()


def preference_dict(preference):
    return {"pet_type": preference.pet_type, "rhythm": preference.rhythm, "home": preference.home, "wishes": preference.wishes}


TINDER_CARD_LIMIT = 6
TOPIC_IDS = {topic[0] for topic in PORTRAIT_TOPICS}


def explicit_pet_type(text: str) -> str | None:
    lower = text.lower()
    if not any(marker in lower for marker in ("хочу", "ищу", "приют", "выбрал", "нужн")):
        return None
    has_dog = "собак" in lower or "пёс" in lower or "пес" in lower
    has_cat = "кош" in lower
    if has_dog and not has_cat:
        return "Собака"
    if has_cat and not has_dog:
        return "Кошка"
    return None


def portrait_for(db: Session, user_id: int) -> OwnerPortrait:
    portrait = db.scalar(select(OwnerPortrait).where(OwnerPortrait.user_id == user_id))
    if not portrait:
        portrait = OwnerPortrait(user_id=user_id)
        db.add(portrait)
        db.flush()
    return portrait


def covered_topics(portrait: OwnerPortrait) -> set[str]:
    aliases = {
        "time": "routine", "household": "home", "activity": "temperament",
        "health": "care", "budget": "care", "expectations": "motivation", "boundaries": "support",
    }
    return {aliases.get(topic, topic) for topic in (portrait.covered_topics or []) if aliases.get(topic, topic) in TOPIC_IDS}


def portrait_status(portrait: OwnerPortrait) -> PortraitStatusOut:
    covered = covered_topics(portrait)
    next_topic = next((topic for topic in PORTRAIT_TOPICS if topic[0] not in covered), None)
    return PortraitStatusOut(
        completeness=portrait.completeness,
        answer_count=portrait.answer_count,
        next_topic=next_topic[0] if next_topic else None,
        topics=[PortraitTopic(id=topic[0], label=topic[1], covered=topic[0] in covered) for topic in PORTRAIT_TOPICS],
    )


def answer_covers_topic(topic_id: str, text: str) -> bool:
    lower = text.lower()
    if len(text.strip()) < 8:
        return False
    if any(marker in lower for marker in ("пропустить", "не хочу отвечать", "отвечу потом", "пока не знаю")):
        return True
    markers = {
        "routine": ("будн", "выходн", "работ", "день", "час", "дома", "один", "отсутств"),
        "home": ("квартир", "дом", "двор", "лестниц", "место", "семь", "жив", "дет", "пожил", "близк"),
        "animals": ("кот", "собак", "живот", "питом"),
        "experience": ("раньше", "опыт", "питом", "заботил"),
        "temperament": ("спокой", "ласк", "энерг", "характер", "общител", "гуля", "игр", "обуч", "занят", "прогул"),
        "care": ("уход", "ветеринар", "корм", "режим", "обязан", "аллер", "здоров", "огранич", "медицин", "руб", "расход", "бюджет", "стоим", "финанс"),
        "motivation": ("хочу", "почему", "дать", "причин", "мечт", "ожида", "первые", "привык", "вместе", "представля"),
        "support": ("помощ", "сосед", "родствен", "отпуск", "форс-мажор", "не готов", "сложн", "не хочу", "границ", "терпел"),
    }
    return any(marker in lower for marker in markers.get(topic_id, ()))


def new_conversation(db: Session, user: User):
    conversation = Conversation(user_id=user.id, title="Первое знакомство")
    db.add(conversation)
    db.flush()
    db.add(Message(conversation_id=conversation.id, role="assistant", content="Привет! Помогу найти питомца, который подойдёт именно твоей жизни. Кого ты хотел бы приютить — собаку, кошку или пока не определился? А потом я задам несколько более глубоких вопросов — о ритме дня, доме, опыте и том, каким ты видишь вашу жизнь вместе."))
    return conversation


def recommendation_query(db: Session, preference: Preference | None = None, portrait: OwnerPortrait | None = None, limit: int = 6):
    animals = list(db.scalars(select(Animal).where(Animal.is_available.is_(True))))
    visible = preference_dict(preference) if preference else {}
    if visible.get("pet_type") in {"Собака", "Кошка"}:
        animals = [animal for animal in animals if animal.species == visible["pet_type"]]
    private_text = " ".join(str(value) for value in (portrait.facts or {}).values()) if portrait else ""
    private_text = f"{private_text} {(portrait.summary or '') if portrait else ''}".lower()

    def score(animal: Animal):
        text = " ".join(filter(None, [animal.description, animal.character, animal.suitable_for, animal.health, animal.shelter])).lower()
        points = 0
        if visible.get("pet_type") and visible["pet_type"] == animal.species:
            points += 12
        if visible.get("home") == "Квартира" and "квартир" in text:
            points += 5
        if visible.get("rhythm") == "Активный" and any(word in text for word in ("прогул", "актив", "игр", "бег")):
            points += 4
        if "дет" in private_text:
            points += 3 if animal.children_compatible else -2 if animal.children_compatible is False else 0
        if any(word in private_text for word in ("другие живот", "есть кот", "есть собак")):
            points += 3 if animal.pets_compatible else -2 if animal.pets_compatible is False else 0
        if any(word in private_text for word in ("спокой", "тих")) and any(word in text for word in ("спокой", "скром", "нежн")):
            points += 3
        return points, animal.name

    return sorted(animals, key=score, reverse=True)[:limit]


def interview_complete(portrait: OwnerPortrait) -> bool:
    return len(covered_topics(portrait)) >= len(PORTRAIT_TOPICS)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "pet-connect"}


@app.post("/api/auth/register", response_model=TokenOut, status_code=201)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "Пользователь с таким email уже зарегистрирован")
    user = User(name=payload.name.strip(), email=email, password_hash=hash_password(payload.password), role="USER")
    db.add(user)
    db.flush()
    db.add(Preference(user_id=user.id))
    db.add(OwnerPortrait(user_id=user.id))
    conversation = new_conversation(db, user)
    db.commit()
    db.refresh(user)
    return TokenOut(access_token=create_token(user), user=user, conversation=conversation)


@app.post("/api/auth/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Неверный email или пароль")
    conversation = db.scalar(select(Conversation).where(Conversation.user_id == user.id).order_by(Conversation.updated_at.desc()))
    if not conversation:
        conversation = new_conversation(db, user)
        db.commit()
    return TokenOut(access_token=create_token(user), user=user, conversation=conversation)


@app.get("/api/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user


@app.patch("/api/account", response_model=UserOut)
def update_account(payload: AccountUpdateIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    email = payload.email.lower()
    existing = db.scalar(select(User).where(User.email == email, User.id != user.id))
    if existing:
        raise HTTPException(409, "Пользователь с таким email уже зарегистрирован")
    if payload.avatar_url and not payload.avatar_url.startswith(("data:image/png;base64,", "data:image/jpeg;base64,", "data:image/webp;base64,", "data:image/gif;base64,")):
        raise HTTPException(400, "Аватар должен быть изображением PNG, JPEG, WEBP или GIF")
    user.name = payload.name.strip()
    user.email = email
    user.phone = payload.phone or None
    user.city = payload.city or None
    user.postal_code = payload.postal_code or None
    user.address = payload.address or None
    user.contact_method = payload.contact_method or None
    user.avatar_url = payload.avatar_url or None
    db.commit()
    db.refresh(user)
    return user


@app.get("/api/manager/ai-flow")
def manager_ai_flow(_: User = Depends(manager_only), db: Session = Depends(get_db)):
    record = db.scalar(select(AISettingsRecord).where(AISettingsRecord.id == 1))
    conversation = db.scalar(select(Conversation).join(User, User.id == Conversation.user_id).where(User.role == "USER").order_by(Conversation.updated_at.desc()))
    if not conversation:
        return {"enabled": bool(record and record.enabled), "conversation_id": None, "user_name": None, "user_answer": None, "expert": {"covered_topics": [], "facts": {}, "summary": None, "preferences": {}}, "assistant_reply": None, "recommendation_ready": False}
    messages = list(db.scalars(select(Message).where(Message.conversation_id == conversation.id).order_by(Message.created_at.desc()).limit(20)))
    user_message = next((message for message in messages if message.role == "user"), None)
    assistant_message = next((message for message in messages if message.role == "assistant"), None)
    portrait = db.scalar(select(OwnerPortrait).where(OwnerPortrait.user_id == conversation.user_id))
    preference = db.scalar(select(Preference).where(Preference.user_id == conversation.user_id))
    covered = covered_topics(portrait) if portrait else set()
    labels = [topic[1] for topic in PORTRAIT_TOPICS if topic[0] in covered]
    return {"enabled": bool(record and record.enabled), "conversation_id": conversation.id, "user_name": conversation.user.name, "user_answer": user_message.content if user_message else None, "expert": {"covered_topics": labels[-5:], "facts": portrait.facts if portrait else {}, "summary": portrait.summary if portrait else None, "preferences": preference_dict(preference)}, "assistant_reply": assistant_message.content if assistant_message else None, "recommendation_ready": conversation.interview_complete}


@app.get("/api/animals", response_model=list[AnimalOut])
def animals(only_without_guardians: bool = False, db: Session = Depends(get_db)):
    query = select(Animal).where(Animal.is_available.is_(True)).order_by(Animal.name)
    if only_without_guardians:
        query = query.where(Animal.guardians == "Пока без опекунов")
    return list(db.scalars(query))


@app.get("/api/profile", response_model=PreferenceOut)
def get_profile(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.scalar(select(Preference).where(Preference.user_id == user.id))


@app.get("/api/portrait", response_model=PortraitStatusOut)
def get_portrait_status(user: User = Depends(current_user), db: Session = Depends(get_db)):
    portrait = portrait_for(db, user.id)
    db.commit()
    return portrait_status(portrait)


@app.patch("/api/profile", response_model=PreferenceOut)
def update_profile(payload: PreferenceIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    preference = db.scalar(select(Preference).where(Preference.user_id == user.id))
    if not preference:
        preference = Preference(user_id=user.id)
        db.add(preference)
        db.flush()
    for field in ("pet_type", "rhythm", "home", "wishes"):
        value = getattr(payload, field)
        value = value or None
        if value != getattr(preference, field):
            db.add(PreferenceChange(user_id=user.id, field=field, old_value=getattr(preference, field), new_value=value))
            setattr(preference, field, value)
    db.commit()
    db.refresh(preference)
    return preference


@app.get("/api/profile/history")
def profile_history(user: User = Depends(current_user), db: Session = Depends(get_db)):
    changes = db.scalars(select(PreferenceChange).where(PreferenceChange.user_id == user.id).order_by(PreferenceChange.created_at.desc()).limit(100))
    return [{"field": item.field, "old_value": item.old_value, "new_value": item.new_value, "created_at": item.created_at} for item in changes]


@app.get("/api/conversations", response_model=list[ConversationOut])
def conversations(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return list(db.scalars(select(Conversation).where(Conversation.user_id == user.id).order_by(Conversation.updated_at.desc())))


@app.post("/api/conversations", response_model=ConversationOut, status_code=201)
def create_conversation(user: User = Depends(current_user), db: Session = Depends(get_db)):
    conversation = new_conversation(db, user)
    db.commit()
    db.refresh(conversation)
    return conversation


@app.get("/api/conversations/{conversation_id}/messages", response_model=list[MessageOut])
def conversation_messages(conversation_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    conversation = db.scalar(select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == user.id))
    if not conversation:
        raise HTTPException(404, "Диалог не найден")
    return list(db.scalars(select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at)))


@app.post("/api/chat/messages", response_model=ChatOut)
async def chat(payload: ChatIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    conversation = db.scalar(select(Conversation).where(Conversation.id == payload.conversation_id, Conversation.user_id == user.id)) if payload.conversation_id else None
    if not conversation:
        conversation = new_conversation(db, user)
    conversation_answer_count = db.scalar(select(func.count(Message.id)).where(Message.conversation_id == conversation.id, Message.role == "user")) or 0
    user_message = Message(conversation_id=conversation.id, role="user", content=payload.content.strip())
    db.add(user_message)
    preference = db.scalar(select(Preference).where(Preference.user_id == user.id))
    if not preference:
        preference = Preference(user_id=user.id)
        db.add(preference)
        db.flush()
    portrait = portrait_for(db, user.id)
    db.commit()
    timestamp = datetime.now(timezone.utc).isoformat()
    await events.publish({"type": "user_message", "user_id": user.id, "conversation_id": conversation.id, "at": timestamp})
    await events.publish_user(user.id, {"type": "dialog_received", "stage": "received", "at": timestamp})
    covered = covered_topics(portrait)
    topic = next((item for item in PORTRAIT_TOPICS if item[0] not in covered), PORTRAIT_TOPICS[-1])
    await events.publish({"type": "portrait_analysis_started", "user_id": user.id, "topic": topic[0], "at": datetime.now(timezone.utc).isoformat()})
    await events.publish_user(user.id, {"type": "portrait_analysis_started", "stage": "analysis", "topic": topic[1], "at": datetime.now(timezone.utc).isoformat()})
    analyzed = await ai.analyze_portrait(payload.content, topic[0], {"facts": portrait.facts or {}, "covered_topics": list(covered)}, db=db, user_id=user.id, conversation_id=conversation.id)
    await events.publish({"type": "expert_response", "user_id": user.id, "conversation_id": conversation.id, "answer": payload.content.strip(), "analysis": analyzed, "at": datetime.now(timezone.utc).isoformat()})
    extracted = {key: value for key, value in analyzed.get("preferences", {}).items() if key in {"pet_type", "rhythm", "home", "wishes"} and value}
    if explicit_type := explicit_pet_type(payload.content):
        extracted["pet_type"] = explicit_type
    elif preference.pet_type:
        extracted.pop("pet_type", None)
    for field, value in extracted.items():
        if value and value != getattr(preference, field):
            db.add(PreferenceChange(user_id=user.id, field=field, old_value=getattr(preference, field), new_value=value))
            setattr(preference, field, value)
    facts = dict(portrait.facts or {})
    facts.update(analyzed.get("facts") or {})
    answers = list(portrait.answers or [])
    answers.append({"topic": topic[0], "answer": payload.content.strip(), "at": datetime.now(timezone.utc).isoformat()})
    topic_complete = analyzed.get("topic_complete", False) or answer_covers_topic(topic[0], payload.content)
    if topic_complete and topic[0] not in covered:
        covered.add(topic[0])
    portrait.facts = facts
    portrait.answers = answers[-100:]
    portrait.covered_topics = list(covered)
    portrait.answer_count = len(portrait.answers)
    portrait.completeness = round(len(covered) / len(PORTRAIT_TOPICS) * 100)
    if analyzed.get("summary"):
        portrait.summary = analyzed["summary"]
    portrait.question_index = min(len(covered), len(PORTRAIT_TOPICS))
    db.commit()
    complete = interview_complete(portrait)
    conversation_complete = complete and conversation_answer_count + 1 >= len(PORTRAIT_TOPICS)
    if conversation_complete:
        conversation.interview_complete = True
    animals_for_reply = recommendation_query(db, preference, portrait) if conversation_complete else []
    next_topic = next((item for item in PORTRAIT_TOPICS if item[0] not in covered), None)
    if not topic_complete:
        next_topic = topic
    await events.publish({"type": "preferences_updated", "user_id": user.id, "fields": list(extracted), "at": datetime.now(timezone.utc).isoformat()})
    await events.publish({"type": "portrait_updated", "user_id": user.id, "covered_topics": len(covered), "total_topics": len(PORTRAIT_TOPICS), "at": datetime.now(timezone.utc).isoformat()})
    await events.publish_user(user.id, {"type": "portrait_updated", "stage": "portrait", "completeness": portrait.completeness, "covered_topics": len(covered), "total_topics": len(PORTRAIT_TOPICS), "at": datetime.now(timezone.utc).isoformat()})
    if conversation_complete:
        await events.publish({"type": "interview_complete", "user_id": user.id, "at": datetime.now(timezone.utc).isoformat()})
        await events.publish_user(user.id, {"type": "interview_complete", "stage": "recommendations", "at": datetime.now(timezone.utc).isoformat()})
        await events.publish_user(user.id, {"type": "recommendation_started", "stage": "recommendations", "at": datetime.now(timezone.utc).isoformat()})
    await events.publish({"type": "assistant_context", "user_id": user.id, "conversation_id": conversation.id, "preferences": preference_dict(preference), "next_question": next_topic[2] if next_topic else None, "catalog_names": [animal.name for animal in animals_for_reply[:3]], "at": datetime.now(timezone.utc).isoformat()})
    reply = await ai.narrate(payload.content, preference_dict(preference), [{"name": animal.name} for animal in animals_for_reply], facts, next_topic, db=db, user_id=user.id, conversation_id=conversation.id)
    assistant_message = Message(conversation_id=conversation.id, role="assistant", content=reply)
    conversation.title = "Подбор питомца"
    db.add(assistant_message)
    db.commit()
    db.refresh(user_message)
    db.refresh(assistant_message)
    db.refresh(conversation)
    await events.publish({"type": "assistant_message", "user_id": user.id, "conversation_id": conversation.id, "at": datetime.now(timezone.utc).isoformat()})
    await events.publish({"type": "assistant_response", "user_id": user.id, "conversation_id": conversation.id, "content": reply, "at": datetime.now(timezone.utc).isoformat()})
    await events.publish_user(user.id, {"type": "assistant_message", "stage": "complete", "at": datetime.now(timezone.utc).isoformat()})
    return ChatOut(conversation=conversation, user_message=user_message, assistant_message=assistant_message, preference=preference, recommendations=animals_for_reply, portrait=portrait_status(portrait))


@app.get("/api/favorites", response_model=list[AnimalOut])
def favorites(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return list(db.scalars(select(Animal).join(Favorite, Favorite.animal_id == Animal.id).where(Favorite.user_id == user.id).order_by(Favorite.created_at.desc())))


@app.post("/api/favorites/{animal_id}")
def add_favorite(animal_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not db.get(Animal, animal_id):
        raise HTTPException(404, "Питомец не найден")
    if not db.scalar(select(Favorite).where(Favorite.user_id == user.id, Favorite.animal_id == animal_id)):
        db.add(Favorite(user_id=user.id, animal_id=animal_id))
        db.commit()
    return {"ok": True}


@app.delete("/api/favorites/{animal_id}")
def remove_favorite(animal_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.execute(delete(Favorite).where(Favorite.user_id == user.id, Favorite.animal_id == animal_id))
    db.commit()
    return {"ok": True}


@app.get("/api/tinder/next", response_model=list[AnimalOut])
def tinder_next(user: User = Depends(current_user), db: Session = Depends(get_db)):
    portrait = portrait_for(db, user.id)
    if not interview_complete(portrait):
        raise HTTPException(409, "Сначала завершите интервью — после этого откроется подбор карточек")
    swiped = select(Swipe.animal_id).where(Swipe.user_id == user.id)
    ranked = recommendation_query(db, db.scalar(select(Preference).where(Preference.user_id == user.id)), portrait, limit=100)
    return [animal for animal in ranked if animal.id not in set(db.scalars(swiped))][:TINDER_CARD_LIMIT]


@app.post("/api/tinder/{animal_id}")
def tinder_swipe(animal_id: int, payload: SwipeIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    portrait = portrait_for(db, user.id)
    if not interview_complete(portrait):
        raise HTTPException(409, "Сначала завершите интервью — после этого откроется подбор карточек")
    if not db.get(Animal, animal_id):
        raise HTTPException(404, "Питомец не найден")
    existing = db.scalar(select(Swipe).where(Swipe.user_id == user.id, Swipe.animal_id == animal_id))
    if existing:
        existing.decision = payload.decision
    else:
        db.add(Swipe(user_id=user.id, animal_id=animal_id, decision=payload.decision))
    if payload.decision == "like" and not db.scalar(select(Favorite).where(Favorite.user_id == user.id, Favorite.animal_id == animal_id)):
        db.add(Favorite(user_id=user.id, animal_id=animal_id))
    db.commit()
    return {"ok": True, "decision": payload.decision}


@app.get("/api/manager/overview")
def manager_overview(_: User = Depends(manager_only), db: Session = Depends(get_db)):
    return {"users": db.scalar(select(func.count(User.id)).where(User.role == "USER")) or 0, "animals": db.scalar(select(func.count(Animal.id)).where(Animal.is_available.is_(True))) or 0, "conversations": db.scalar(select(func.count(Conversation.id))) or 0, "without_guardians": db.scalar(select(func.count(Animal.id)).where(Animal.guardians == "Пока без опекунов")) or 0}


def usage_item(item: AIUsageLog, user_name: str | None = None) -> dict:
    return {
        "id": item.id,
        "created_at": item.created_at,
        "agent": item.agent,
        "model": item.model,
        "input_tokens": item.input_tokens,
        "output_tokens": item.output_tokens,
        "total_tokens": item.total_tokens,
        "cost_usd": float(item.cost_usd) if item.cost_usd is not None else None,
        "usage_available": item.usage_available,
        "pricing_available": item.pricing_available,
        "status": item.status,
        "user_name": user_name,
    }


@app.get("/api/manager/ai-pricing", response_model=list[AIPricingOut])
def get_ai_pricing(_: User = Depends(manager_only), db: Session = Depends(get_db)):
    return list(db.scalars(select(AIModelPricing).order_by(AIModelPricing.model)))


@app.put("/api/manager/ai-pricing", response_model=AIPricingOut)
def update_ai_pricing(payload: AIPricingIn, _: User = Depends(manager_only), db: Session = Depends(get_db)):
    model = payload.model.strip()
    pricing = db.scalar(select(AIModelPricing).where(AIModelPricing.model == model))
    if not pricing:
        pricing = AIModelPricing(model=model)
        db.add(pricing)
    pricing.input_usd_per_million = payload.input_usd_per_million
    pricing.output_usd_per_million = payload.output_usd_per_million
    db.commit()
    db.refresh(pricing)
    return pricing


@app.get("/api/manager/ai-analytics", response_model=AIAnalyticsOut)
def ai_analytics(
    start_date: date | None = None,
    end_date: date | None = None,
    model: str | None = None,
    granularity: str = Query("day", pattern="^(day|week|month)$"),
    _: User = Depends(manager_only),
    db: Session = Depends(get_db),
):
    today = datetime.now(timezone.utc).date()
    first = start_date or today - timedelta(days=29)
    last = end_date or today
    if last < first:
        raise HTTPException(400, "Дата окончания не может быть раньше даты начала")
    start = datetime(first.year, first.month, first.day, tzinfo=timezone.utc)
    end = datetime(last.year, last.month, last.day, tzinfo=timezone.utc) + timedelta(days=1)
    query = select(AIUsageLog).where(AIUsageLog.created_at >= start, AIUsageLog.created_at < end).order_by(AIUsageLog.created_at.desc())
    if model:
        query = query.where(AIUsageLog.model == model)
    logs = list(db.scalars(query.limit(500)))
    user_ids = {item.user_id for item in logs if item.user_id is not None}
    names = {user.id: user.name for user in db.scalars(select(User).where(User.id.in_(user_ids)))} if user_ids else {}
    items = [usage_item(item, names.get(item.user_id)) for item in logs]
    complete = [item for item in logs if item.usage_available and item.pricing_available]
    total_input = sum(item.input_tokens or 0 for item in logs)
    total_output = sum(item.output_tokens or 0 for item in logs)
    total = sum(item.total_tokens or 0 for item in logs)
    total_cost = sum(float(item.cost_usd or 0) for item in logs)

    by_day: dict[str, dict] = {}
    by_model: dict[str, dict] = {}
    for item in logs:
        item_date = item.created_at.date()
        if granularity == "week":
            monday = item_date - timedelta(days=item_date.weekday())
            period_key = monday.isoformat()
        elif granularity == "month":
            period_key = item_date.replace(day=1).isoformat()
        else:
            period_key = item_date.isoformat()
        day_row = by_day.setdefault(period_key, {"date": period_key, "requests": 0, "tokens": 0, "cost_usd": 0.0})
        day_row["requests"] += 1
        day_row["tokens"] += item.total_tokens or 0
        day_row["cost_usd"] += float(item.cost_usd or 0)
        model_row = by_model.setdefault(item.model, {"model": item.model, "requests": 0, "tokens": 0, "cost_usd": 0.0})
        model_row["requests"] += 1
        model_row["tokens"] += item.total_tokens or 0
        model_row["cost_usd"] += float(item.cost_usd or 0)
    series = list(reversed(sorted(by_day.values(), key=lambda row: row["date"])))
    usage_models = set(db.scalars(select(AIUsageLog.model).distinct()))
    priced_models = set(db.scalars(select(AIModelPricing.model)))
    all_models = sorted(usage_models | priced_models)
    return {
        "period": {"start_date": first, "end_date": last},
        "summary": {
            "requests": len(logs),
            "input_tokens": total_input,
            "output_tokens": total_output,
            "total_tokens": total,
            "cost_usd": total_cost,
            "average_cost_usd": total_cost / len(logs) if logs else 0,
            "complete_requests": len(complete),
            "incomplete_requests": len(logs) - len(complete),
        },
        "series": series,
        "by_model": sorted(by_model.values(), key=lambda row: row["cost_usd"], reverse=True),
        "most_expensive": sorted(items, key=lambda item: item["cost_usd"] or 0, reverse=True)[:10],
        "history": items[:100],
        "models": all_models,
    }


@app.get("/api/manager/ai-settings", response_model=AISettingsOut)
def get_ai_settings(_: User = Depends(manager_only), db: Session = Depends(get_db)):
    record = db.scalar(select(AISettingsRecord).where(AISettingsRecord.id == 1))
    if not record:
        return AISettingsOut(enabled=False, has_api_key=False)
    return AISettingsOut(enabled=record.enabled, has_api_key=bool(record.encrypted_api_key), updated_at=record.updated_at)


@app.put("/api/manager/ai-settings", response_model=AISettingsOut)
def update_ai_settings(payload: AISettingsIn, _: User = Depends(manager_only), db: Session = Depends(get_db)):
    record = db.scalar(select(AISettingsRecord).where(AISettingsRecord.id == 1))
    if not record:
        record = AISettingsRecord(id=1)
        db.add(record)
    record.enabled = payload.enabled
    if payload.clear_api_key:
        record.encrypted_api_key = None
    elif payload.api_key and payload.api_key.strip():
        record.encrypted_api_key = encrypt_secret(payload.api_key.strip())
    if record.enabled and not record.encrypted_api_key:
        raise HTTPException(400, "Для включения AI сначала сохраните API-ключ")
    db.commit()
    db.refresh(record)
    return AISettingsOut(enabled=record.enabled, has_api_key=bool(record.encrypted_api_key), updated_at=record.updated_at)


@app.get("/api/manager/users", response_model=list[ManagerUserOut])
def manager_users(_: User = Depends(manager_only), db: Session = Depends(get_db)):
    result = []
    for user in db.scalars(select(User).where(User.role == "USER").order_by(User.created_at.desc())):
        result.append(ManagerUserOut(id=user.id, name=user.name, email=user.email, role=user.role, created_at=user.created_at, preference=user.preference, favorite_count=db.scalar(select(func.count(Favorite.id)).where(Favorite.user_id == user.id)) or 0, conversation_count=db.scalar(select(func.count(Conversation.id)).where(Conversation.user_id == user.id)) or 0))
    return result


@app.get("/api/manager/users/{user_id}")
def manager_user_details(user_id: int, _: User = Depends(manager_only), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user or user.role != "USER":
        raise HTTPException(404, "Пользователь не найден")
    portrait = portrait_for(db, user_id)
    return {"user": UserOut.model_validate(user), "preference": PreferenceOut.model_validate(user.preference) if user.preference else None, "portrait": {"summary": portrait.summary, "facts": portrait.facts, "answers": portrait.answers, "status": portrait_status(portrait).model_dump()}, "favorites": [AnimalOut.model_validate(x) for x in db.scalars(select(Animal).join(Favorite, Favorite.animal_id == Animal.id).where(Favorite.user_id == user_id))], "conversations": [{"id": c.id, "title": c.title, "messages": [MessageOut.model_validate(m) for m in c.messages]} for c in db.scalars(select(Conversation).where(Conversation.user_id == user_id))]}


@app.websocket("/ws/events")
async def event_stream(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return
    try:
        from jose import jwt
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        if payload.get("role") != "MANAGER":
            await websocket.close(code=4403)
            return
    except Exception:
        await websocket.close(code=4401)
        return
    await events.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        events.disconnect(websocket)


@app.websocket("/ws/portrait")
async def portrait_stream(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return
    try:
        from jose import jwt
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user_id = int(payload["sub"])
    except Exception:
        await websocket.close(code=4401)
        return
    await events.connect_user(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        events.disconnect(websocket)
