import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import Settings
from .models import Animal, User


class IntegrationError(RuntimeError):
    pass


def _payload_url(settings: Settings) -> str:
    return f"{settings.payload_api_url.rstrip('/')}/{settings.payload_animals_collection.strip('/') }"


def _payload_headers(settings: Settings) -> dict[str, str]:
    return {"Authorization": f"JWT {settings.payload_api_token}", "Content-Type": "application/json"}


def sync_animals_to_payload(db: Session, settings: Settings) -> dict:
    if not settings.payload_api_url or not settings.payload_api_token:
        raise IntegrationError("Payload не настроен: задайте PAYLOAD_API_URL и PAYLOAD_API_TOKEN")
    animals = list(db.scalars(select(Animal).order_by(Animal.id)))
    created = 0
    updated = 0
    with httpx.Client(timeout=20) as client:
        for animal in animals:
            payload = {
                "externalId": f"petconnect-animal-{animal.id}",
                "sourceId": animal.source_id,
                "name": animal.name,
                "age": animal.age,
                "gender": animal.gender,
                "species": animal.species,
                "breed": animal.breed,
                "shelter": animal.shelter,
                "guardians": animal.guardians,
                "description": animal.description,
                "character": animal.character,
                "suitableFor": animal.suitable_for,
                "health": animal.health,
                "childrenCompatible": animal.children_compatible,
                "petsCompatible": animal.pets_compatible,
                "imageUrl": animal.image_url,
                "sourceUrl": animal.source_url,
                "gallery": animal.gallery,
                "isAvailable": animal.is_available,
            }
            query = {"where[externalId][equals]": payload["externalId"], "limit": 1}
            response = client.get(_payload_url(settings), headers=_payload_headers(settings), params=query)
            if response.status_code >= 400:
                raise IntegrationError(f"Payload: поиск животного завершился с HTTP {response.status_code}")
            docs = response.json().get("docs", [])
            if docs:
                remote_id = docs[0].get("id")
                response = client.patch(f"{_payload_url(settings)}/{remote_id}", headers=_payload_headers(settings), json=payload)
                updated += 1
            else:
                response = client.post(_payload_url(settings), headers=_payload_headers(settings), json=payload)
                created += 1
            if response.status_code >= 400:
                raise IntegrationError(f"Payload: сохранение животного завершилось с HTTP {response.status_code}: {response.text[:300]}")
    return {"created": created, "updated": updated, "total": len(animals)}


def _bitrix_call(client: httpx.Client, webhook: str, method: str, params: dict) -> dict:
    response = client.post(f"{webhook.rstrip('/')}/{method}.json", json=params)
    if response.status_code >= 400:
        raise IntegrationError(f"Bitrix24: HTTP {response.status_code}")
    body = response.json()
    if body.get("error"):
        raise IntegrationError(f"Bitrix24: {body.get('error_description') or body['error']}")
    return body.get("result", {})


def sync_users_to_bitrix(db: Session, settings: Settings) -> dict:
    if not settings.bitrix_webhook_url:
        raise IntegrationError("Bitrix24 не настроен: задайте BITRIX_WEBHOOK_URL")
    users = list(db.scalars(select(User).where(User.role == "USER").order_by(User.id)))
    created = 0
    updated = 0
    with httpx.Client(timeout=20) as client:
        for user in users:
            fields = {
                "NAME": user.name,
                "EMAIL": [{"VALUE": user.email, "VALUE_TYPE": "WORK"}],
                "PHONE": [{"VALUE": user.phone, "VALUE_TYPE": "WORK"}] if user.phone else [],
                "ADDRESS": user.address or "",
                "COMMENTS": f"PET CONNECT user_id={user.id}; город: {user.city or 'не указан'}",
            }
            contacts = _bitrix_call(client, settings.bitrix_webhook_url, "crm.contact.list", {"filter": {"EMAIL": user.email}, "select": ["ID", "EMAIL"]})
            if contacts:
                _bitrix_call(client, settings.bitrix_webhook_url, "crm.contact.update", {"id": contacts[0]["ID"], "fields": fields})
                updated += 1
            else:
                _bitrix_call(client, settings.bitrix_webhook_url, "crm.contact.add", {"fields": fields})
                created += 1
    return {"created": created, "updated": updated, "total": len(users)}


def integration_status(settings: Settings) -> dict:
    return {
        "payload": {"configured": bool(settings.payload_api_url and settings.payload_api_token), "collection": settings.payload_animals_collection},
        "bitrix": {"configured": bool(settings.bitrix_webhook_url)},
    }
