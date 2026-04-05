from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import supabase
from services.llm_service import llm
from schemas import BucketCreate, BucketUpdate, BucketStatusUpdate, DiscoverFeedItem, BucketDisplay

router = APIRouter(prefix="/api/buckets", tags=["Buckets"])

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

@router.get("/feed/discover/{user_id}")
async def get_discover_feed(user_id: str):
    try:
        # 1. Fetch the user's dream board
        bucket_list_response = supabase.table("bucket_list_items").select("*").eq("user_id", user_id).execute()
        user_goals = bucket_list_response.data

        user_location = supabase.table("users").select("location").eq("id", user_id).execute().data[0].get("location", "San Diego")
        print("User location:", user_location)

        # 2. If they have no goals yet, give them a generic San Diego starter pack
        if not user_goals:
            user_goals = [{"title": "Explore San Diego", "deadline": "None"}]

        # 3. Use FAST Gemini to generate 10 ideas instantly
        system_prompt = (
            "You are the Bucket App recommendation engine. Look at the user's high-level goals "
            f"and suggest 10 highly specific, actionable local events in {user_location} that match them. "
            # "Do not search the web. Rely on your internal knowledge of the city."
        )

        # Notice we are passing the goals as context to our LLM service
        feed_items = llm.generate_structured_response(
            system_instruction=system_prompt,
            user_prompt="Generate my daily discover feed.",
            response_schema=list[BucketDisplay],
            user_context={"user_goals": user_goals}
        )

        return {"status": "success", "data": feed_items}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))