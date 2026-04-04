from fastapi import APIRouter, Query

from app.schemas.bucket_list import BucketListItemCreate, BucketListItemRead
from app.services.supabase_service import create_bucket_list_item, list_bucket_list_items


router = APIRouter()


@router.get("/bucket-list-items", response_model=list[BucketListItemRead])
async def get_bucket_list_items(user_id: str | None = Query(default=None)) -> list[BucketListItemRead]:
    return await list_bucket_list_items(user_id)


@router.post("/bucket-list-items", response_model=BucketListItemRead)
async def post_bucket_list_item(payload: BucketListItemCreate) -> BucketListItemRead:
    return await create_bucket_list_item(payload)
