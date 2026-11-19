from datetime import datetime, timezone
from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session
from .ai import AIService
from .auth import create_token, current_user, hash_password, manager_only, verify_password
from .config import get_settings
from .db import get_db
from .models import Animal, Conversation, Favorite, Message, Preference, PreferenceChange, Swipe, User
from .realtime import events
from .schemas import AnimalOut, ChatIn, ChatOut, ConversationOut, LoginIn, ManagerUserOut, MessageOut, PreferenceIn, PreferenceOut, RegisterIn, SwipeIn, TokenOut, UserOut


app = FastAPI(title="PET CONNECT API", version="1.0.0")
settings = get_settings()
app.add_middleware(CORSMiddleware, allow_origins=settings.origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
ai = AIService()


def preference_dict(preference):
    return {"pet_type": preference.pet_type, "rhythm": preference.rhythm, "home": preference.home, "wishes": preference.wishes}


def new_conversation(db: Session, user: User):
    conversation = Conversation(user_id=user.id, title="Первое знакомство")
    db.add(conversation)
    db.flush()
    db.add(Message(conversation_id=conversation.id, role="assistant", content="Привет! Помогу найти питомца, который подойдёт твоему образу жизни. Кого ты хотел бы приютить — собаку, кошку или пока не определился?"))
    return conversation


def recommendation_query(db: Session, limit: int = 6):
    return list(db.scalars(select(Animal).where(Animal.is_available.is_(True)).order_by(Animal.name).limit(limit)))


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


@app.get("/api/animals", response_model=list[AnimalOut])
def animals(only_without_guardians: bool = False, db: Session = Depends(get_db)):
    query = select(Animal).where(Animal.is_available.is_(True)).order_by(Animal.name)
    if only_without_guardians:
        query = query.where(Animal.guardians == "Пока без опекунов")
    return list(db.scalars(query))


@app.get("/api/profile", response_model=PreferenceOut)
def get_profile(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.scalar(select(Preference).where(Preference.user_id == user.id))


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
    user_message = Message(conversation_id=conversation.id, role="user", content=payload.content.strip())
    db.add(user_message)
    preference = db.scalar(select(Preference).where(Preference.user_id == user.id))
    if not preference:
        preference = Preference(user_id=user.id)
        db.add(preference)
        db.flush()
    db.commit()
    await events.publish({"type": "user_message", "user_id": user.id, "conversation_id": conversation.id, "at": datetime.now(timezone.utc).isoformat()})
    extracted = await ai.analyze(payload.content)
    for field, value in extracted.items():
        if value and value != getattr(preference, field):
            db.add(PreferenceChange(user_id=user.id, field=field, old_value=getattr(preference, field), new_value=value))
            setattr(preference, field, value)
    db.commit()
    animals_for_reply = recommendation_query(db)
    await events.publish({"type": "preferences_updated", "user_id": user.id, "fields": list(extracted), "at": datetime.now(timezone.utc).isoformat()})
    reply = await ai.narrate(payload.content, preference_dict(preference), [{"name": animal.name} for animal in animals_for_reply])
    assistant_message = Message(conversation_id=conversation.id, role="assistant", content=reply)
    conversation.title = "Подбор питомца"
    db.add(assistant_message)
    db.commit()
    db.refresh(user_message)
    db.refresh(assistant_message)
    db.refresh(conversation)
    await events.publish({"type": "assistant_message", "user_id": user.id, "conversation_id": conversation.id, "at": datetime.now(timezone.utc).isoformat()})
    return ChatOut(conversation=conversation, user_message=user_message, assistant_message=assistant_message, preference=preference, recommendations=animals_for_reply)


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
    swiped = select(Swipe.animal_id).where(Swipe.user_id == user.id)
    return list(db.scalars(select(Animal).where(Animal.is_available.is_(True), Animal.id.not_in(swiped)).order_by(Animal.name).limit(20)))


@app.post("/api/tinder/{animal_id}")
def tinder_swipe(animal_id: int, payload: SwipeIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
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
    return {"user": UserOut.model_validate(user), "preference": PreferenceOut.model_validate(user.preference) if user.preference else None, "favorites": [AnimalOut.model_validate(x) for x in db.scalars(select(Animal).join(Favorite, Favorite.animal_id == Animal.id).where(Favorite.user_id == user_id))], "conversations": [{"id": c.id, "title": c.title, "messages": [MessageOut.model_validate(m) for m in c.messages]} for c in db.scalars(select(Conversation).where(Conversation.user_id == user_id))]}


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
