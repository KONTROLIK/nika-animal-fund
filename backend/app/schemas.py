from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: EmailStr
    phone: str | None = None
    city: str | None = None
    postal_code: str | None = None
    address: str | None = None
    contact_method: str | None = None
    avatar_url: str | None = None
    role: str
    created_at: datetime


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AccountUpdateIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=40)
    city: str | None = Field(default=None, max_length=120)
    postal_code: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=300)
    contact_method: str | None = Field(default=None, pattern="^(email|phone|telegram)$")
    avatar_url: str | None = Field(default=None, max_length=2_000_000)


class PreferenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    pet_type: str | None = None
    rhythm: str | None = None
    home: str | None = None
    wishes: str | None = None
    updated_at: datetime


class PreferenceIn(BaseModel):
    pet_type: str | None = Field(default=None, max_length=40)
    rhythm: str | None = Field(default=None, max_length=80)
    home: str | None = Field(default=None, max_length=80)
    wishes: str | None = Field(default=None, max_length=3000)


class PortraitTopic(BaseModel):
    id: str
    label: str
    covered: bool


class PortraitStatusOut(BaseModel):
    completeness: int
    answer_count: int
    next_topic: str | None = None
    topics: list[PortraitTopic]


class AISettingsOut(BaseModel):
    enabled: bool
    has_api_key: bool
    updated_at: datetime | None = None


class AISettingsIn(BaseModel):
    enabled: bool = False
    api_key: str | None = Field(default=None, max_length=500)
    clear_api_key: bool = False


class AIPricingIn(BaseModel):
    model: str = Field(min_length=1, max_length=160)
    input_usd_per_million: float = Field(ge=0)
    output_usd_per_million: float = Field(ge=0)


class AIPricingOut(AIPricingIn):
    model_config = ConfigDict(from_attributes=True)
    updated_at: datetime | None = None


class AIUsageItemOut(BaseModel):
    id: int
    created_at: datetime
    agent: str
    model: str
    input_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None
    cost_usd: float | None = None
    usage_available: bool
    pricing_available: bool
    status: str
    user_name: str | None = None


class AIAnalyticsOut(BaseModel):
    period: dict
    summary: dict
    series: list[dict]
    by_model: list[dict]
    most_expensive: list[AIUsageItemOut]
    history: list[AIUsageItemOut]
    models: list[str]


class AITestIn(BaseModel):
    agent: str = Field(pattern="^(narrator|expert)$")


class AnimalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    source_id: str
    name: str
    age: str
    gender: str
    guardians: str
    species: str
    breed: str | None = None
    shelter: str
    description: str | None = None
    character: str | None = None
    suitable_for: str | None = None
    health: str | None = None
    children_compatible: bool | None = None
    pets_compatible: bool | None = None
    gallery: list[str] = []
    image_url: str
    source_url: str
    is_available: bool


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    role: str
    content: str
    created_at: datetime


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    interview_complete: bool = False
    created_at: datetime
    updated_at: datetime


class ChatIn(BaseModel):
    conversation_id: int | None = None
    content: str = Field(min_length=1, max_length=6000)


class ChatOut(BaseModel):
    conversation: ConversationOut
    user_message: MessageOut
    assistant_message: MessageOut
    preference: PreferenceOut
    recommendations: list[AnimalOut]
    portrait: PortraitStatusOut


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    conversation: ConversationOut


class ManagerUserOut(UserOut):
    preference: PreferenceOut | None = None
    favorite_count: int = 0
    conversation_count: int = 0


class SwipeIn(BaseModel):
    decision: str = Field(pattern="^(like|skip)$")
