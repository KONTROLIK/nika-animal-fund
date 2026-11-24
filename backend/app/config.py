from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)
    database_url: str = "postgresql+psycopg://petconnect:petconnect@localhost:5432/petconnect"
    jwt_secret: str = "local-development-secret-change-me"
    settings_encryption_key: str = ""
    settings_encryption_key: str = ""
    jwt_expire_minutes: int = 10080
    cors_origins: str = "http://localhost:8080,http://localhost:5173"
    ai_base_url: str = "https://anymodel.org/v1"
    ai_model: str = "ds/deepseek-v4.1-flash"
    ai_api_key: str = ""
    manager_email: str = ""
    manager_password: str = ""
    manager_name: str = "Менеджер PET CONNECT"
    admin_email: str = ""
    admin_password: str = ""
    admin_name: str = "Администратор фонда"

    @property
    def origins(self):
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]


@lru_cache
def get_settings():
    return Settings()
