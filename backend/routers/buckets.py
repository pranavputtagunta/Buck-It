from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import supabase

router = APIRouter(prefix="/api/buckets", tags=["Buckets"])

class BucketCreate(BaseModel):
    creator_id: str
    title: str
    category: str
    event_time: str
    status: str = "planned"


class BucketUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    event_time: Optional[str] = None
    status: Optional[str] = None


class BucketStatusUpdate(BaseModel):
    status: str 


@router.get("/")
async def get_all_buckets():
    try:
        response = supabase.table("buckets").select("*").order("created_at", desc=True).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/feed/global")
async def get_global_feed():
    """Fetches recently completed buckets for the feed."""
    try:
        response = supabase.table("buckets").select("*").eq("status", "completed").order("created_at", desc=True).limit(20).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}")
async def get_user_buckets(user_id: str):
    """Fetches all buckets for a specific user."""
    try:
        response = supabase.table("buckets").select("*").eq("creator_id", user_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{bucket_id}")
async def get_bucket(bucket_id: str):
    try:
        response = supabase.table("buckets").select("*").eq("id", bucket_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_bucket(bucket: BucketCreate):
    try:
        response = supabase.table("buckets").insert({
            "creator_id": bucket.creator_id,
            "title": bucket.title,
            "category": bucket.category,
            "event_time": bucket.event_time,
            "status": bucket.status
        }).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{bucket_id}")
async def update_bucket(bucket_id: str, update: BucketUpdate):
    try:
        update_data = update.model_dump(exclude_none=True)
        response = supabase.table("buckets").update(update_data).eq("id", bucket_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{bucket_id}/status")
async def update_bucket_status(bucket_id: str, update: BucketStatusUpdate):
    """Moves a bucket from Planned -> Active -> Completed."""
    try:
        response = supabase.table("buckets").update({"status": update.status}).eq("id", bucket_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{bucket_id}")
async def delete_bucket(bucket_id: str):
    try:
        supabase.table("buckets").delete().eq("id", bucket_id).execute()
        return {"status": "success", "message": "Bucket deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))