import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from .config import get_settings


def _cipher() -> Fernet:
    settings = get_settings()
    raw_key = settings.settings_encryption_key or base64.urlsafe_b64encode(hashlib.sha256(settings.jwt_secret.encode()).digest()).decode()
    return Fernet(raw_key.encode())


def encrypt_secret(value: str) -> str:
    return _cipher().encrypt(value.encode()).decode()


def decrypt_secret(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return _cipher().decrypt(value.encode()).decode()
    except InvalidToken:
        return None
