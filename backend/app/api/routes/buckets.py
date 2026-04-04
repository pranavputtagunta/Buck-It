from fastapi import APIRouter, Query

from app.schemas.bucket import BucketCreate, BucketRead, BucketState
from app.services.supabase_service import create_bucket, list_buckets


router = APIRouter()


@router.get("/buckets", response_model=list[BucketRead])
async def get_buckets(state: BucketState | None = Query(default=None)) -> list[BucketRead]:
    return await list_buckets(state)


@router.post("/buckets", response_model=BucketRead)
async def post_bucket(payload: BucketCreate) -> BucketRead:
    return await create_bucket(payload)
