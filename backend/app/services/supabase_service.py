from datetime import datetime, timedelta
from uuid import uuid4

from supabase import Client, create_client

from app.core.config import get_settings
from app.schemas.bucket import BucketCreate, BucketRead, BucketState
from app.schemas.bucket_list import BucketListItemCreate, BucketListItemRead
from app.schemas.onboarding import BucketListItemSuggestion


_mock_buckets: list[dict] = [
    {
        "id": str(uuid4()),
        "title": "Sunset Kayak Meetup",
        "description": "Easy paddle session with first-timers welcome.",
        "location_name": "Mission Bay",
        "scheduled_at": (datetime.utcnow() + timedelta(days=2)).isoformat(),
        "state": BucketState.planned.value,
        "user_id": None,
        "bucket_list_item_id": None,
    },
    {
        "id": str(uuid4()),
        "title": "Beginner Climbing Night",
        "description": "Indoor gym session and gear orientation.",
        "location_name": "Mesa Cliffs",
        "scheduled_at": (datetime.utcnow() + timedelta(days=1)).isoformat(),
        "state": BucketState.active.value,
        "user_id": None,
        "bucket_list_item_id": None,
    },
    {
        "id": str(uuid4()),
        "title": "Beach Cleanup Scrapbook",
        "description": "Completed community day with photos and recap.",
        "location_name": "La Jolla Shores",
        "scheduled_at": (datetime.utcnow() - timedelta(days=3)).isoformat(),
        "state": BucketState.completed.value,
        "user_id": None,
        "bucket_list_item_id": None,
    },
]

_mock_bucket_list_items: list[dict] = [
    {
        "id": str(uuid4()),
        "title": "Get back into taekwondo",
        "category": "Fitness",
        "deadline": "2026-04-18",
        "motivation": "Build a routine with beginner-friendly sessions.",
        "user_id": None,
        "source": "ai",
    },
    {
        "id": str(uuid4()),
        "title": "Try a new outdoor weekend activity",
        "category": "Adventure",
        "deadline": "2026-04-14",
        "motivation": "Get outside with something social and low-friction.",
        "user_id": None,
        "source": "ai",
    },
]


def _get_supabase_client() -> Client | None:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def list_buckets(state: BucketState | None = None) -> list[BucketRead]:
    client = _get_supabase_client()
    if client is None:
        records = _mock_buckets
        if state is not None:
            records = [bucket for bucket in records if bucket["state"] == state.value]
        return [BucketRead.model_validate(bucket) for bucket in records]

    query = client.table("buckets").select("*")
    if state is not None:
        query = query.eq("state", state.value)
    response = query.execute()
    return [BucketRead.model_validate(bucket) for bucket in response.data]


async def create_bucket(payload: BucketCreate) -> BucketRead:
    client = _get_supabase_client()
    data = payload.model_dump(mode="json")
    if client is None:
        record = {"id": str(uuid4()), **data}
        _mock_buckets.append(record)
        return BucketRead.model_validate(record)

    response = client.table("buckets").insert(data).execute()
    return BucketRead.model_validate(response.data[0])


async def list_bucket_list_items(user_id: str | None = None) -> list[BucketListItemRead]:
    client = _get_supabase_client()
    if client is None:
        records = _mock_bucket_list_items
        if user_id is not None:
            records = [item for item in records if item["user_id"] == user_id]
        return [BucketListItemRead.model_validate(item) for item in records]

    query = client.table("bucket_list_items").select("*")
    if user_id is not None:
        query = query.eq("user_id", user_id)
    response = query.execute()
    return [BucketListItemRead.model_validate(item) for item in response.data]


async def create_bucket_list_item(payload: BucketListItemCreate) -> BucketListItemRead:
    client = _get_supabase_client()
    data = payload.model_dump(mode="json")
    if client is None:
        record = {"id": str(uuid4()), **data}
        _mock_bucket_list_items.append(record)
        return BucketListItemRead.model_validate(record)

    response = client.table("bucket_list_items").insert(data).execute()
    return BucketListItemRead.model_validate(response.data[0])


async def save_generated_bucket_list_items(
    user_id: str,
    items: list[BucketListItemSuggestion],
) -> list[BucketListItemRead]:
    client = _get_supabase_client()
    payload = [
        {
            "user_id": user_id,
            "title": item.title,
            "category": item.category,
            "deadline": item.deadline,
            "motivation": item.motivation,
            "source": "ai",
        }
        for item in items
    ]

    if client is None:
        created = []
        for item in payload:
            record = {"id": str(uuid4()), **item}
            _mock_bucket_list_items.append(record)
            created.append(BucketListItemRead.model_validate(record))
        return created

    response = client.table("bucket_list_items").insert(payload).execute()
    return [BucketListItemRead.model_validate(item) for item in response.data]
