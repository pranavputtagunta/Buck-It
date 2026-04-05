from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import supabase
from services.llm_service import llm
from schemas import BucketCreate, BucketUpdate, BucketStatusUpdate, DiscoverFeedItem, BucketDisplay

router = APIRouter(prefix="/api/buckets", tags=["Buckets"])

def _sync_bucket_visibility(bucket_id: str) -> None:
    bucket_response = (
        supabase.table("buckets")
        .select("id, visibility")
        .eq("id", bucket_id)
        .execute()
    )

    if not bucket_response.data:
        return

    bucket = bucket_response.data[0]
    if bucket.get("visibility") == "public":
        return

    members_response = (
        supabase.table("bucket_members")
        .select("id")
        .eq("bucket_id", bucket_id)
        .execute()
    )
    member_count = len(members_response.data or [])
    visibility = "shared" if member_count > 1 else "private"

    supabase.table("buckets").update({"visibility": visibility}).eq("id", bucket_id).execute()


def _get_bucket_members(bucket_id: str):
    return (
        supabase.table("bucket_members")
        .select("id, user_id, role, joined_at, users(id, display_name)")
        .eq("bucket_id", bucket_id)
        .execute()
    )


def _get_bucket_row(bucket_id: str) -> dict:
    bucket_response = supabase.table("buckets").select("*").eq("id", bucket_id).execute()
    if not bucket_response.data:
        raise HTTPException(status_code=404, detail="Bucket not found")
    return bucket_response.data[0]


def _require_bucket_creator(bucket_id: str, actor_id: str) -> dict:
    bucket = _get_bucket_row(bucket_id)
    if bucket["creator_id"] != actor_id:
        raise HTTPException(status_code=403, detail="Only the bucket creator can perform this action")
    return bucket


def _get_bucket_invitations(bucket_id: str):
    return (
        supabase.table("bucket_invitations")
        .select("id, inviter_id, invitee_id, status, created_at, responded_at")
        .eq("bucket_id", bucket_id)
        .order("created_at", desc=True)
        .execute()
    )


def _build_bucket_details(bucket_row: dict) -> dict:
    members_response = _get_bucket_members(bucket_row["id"])
    invitations_response = _get_bucket_invitations(bucket_row["id"])

    bucket_row["members"] = members_response.data or []
    bucket_row["invitations"] = invitations_response.data or []
    return bucket_row


@router.get("/")
async def get_all_buckets():
    try:
        response = supabase.table("buckets").select("*").order("created_at", desc=True).execute()
        buckets = [_build_bucket_details(bucket) for bucket in (response.data or [])]
        return {"status": "success", "data": buckets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/feed/global")
async def get_global_feed():
    """Fetches recently completed buckets for the feed."""
    try:
        response = (
            supabase.table("buckets")
            .select("*")
            .eq("status", "completed")
            .in_("visibility", ["shared", "public"])
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        buckets = [_build_bucket_details(bucket) for bucket in (response.data or [])]
        return {"status": "success", "data": buckets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}")
async def get_user_buckets(user_id: str):
    """Fetches all buckets for a specific user."""
    try:
        membership_response = (
            supabase.table("bucket_members")
            .select("bucket_id")
            .eq("user_id", user_id)
            .execute()
        )
        bucket_ids = [row["bucket_id"] for row in (membership_response.data or [])]

        if not bucket_ids:
            return {"status": "success", "data": []}

        response = supabase.table("buckets").select("*").in_("id", bucket_ids).order("created_at", desc=True).execute()
        buckets = [_build_bucket_details(bucket) for bucket in (response.data or [])]
        return {"status": "success", "data": buckets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{bucket_id}")
async def get_bucket(bucket_id: str):
    try:
        response = supabase.table("buckets").select("*").eq("id", bucket_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Bucket not found")

        bucket = _build_bucket_details(response.data[0])
        return {"status": "success", "data": bucket}
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
            "status": bucket.status,
            "visibility": bucket.visibility,
        }).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{bucket_id}")
async def update_bucket(bucket_id: str, update: BucketUpdate):
    try:
        _require_bucket_creator(bucket_id, update.actor_id)
        update_data = update.model_dump(exclude_none=True, exclude={"actor_id"})
        if not update_data:
            raise HTTPException(status_code=400, detail="No bucket fields provided to update")
        response = supabase.table("buckets").update(update_data).eq("id", bucket_id).execute()
        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{bucket_id}/status")
async def update_bucket_status(bucket_id: str, update: BucketStatusUpdate):
    """Moves a bucket from Planned -> Active -> Completed."""
    try:
        _require_bucket_creator(bucket_id, update.actor_id)
        response = supabase.table("buckets").update({"status": update.status}).eq("id", bucket_id).execute()
        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{bucket_id}")
async def delete_bucket(bucket_id: str, actor_id: str):
    try:
        _require_bucket_creator(bucket_id, actor_id)
        supabase.table("buckets").delete().eq("id", bucket_id).execute()
        return {"status": "success", "message": "Bucket deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{bucket_id}/members/{member_user_id}")
async def remove_bucket_member(bucket_id: str, member_user_id: str, actor_id: str):
    try:
        bucket = _get_bucket_row(bucket_id)
        if bucket["creator_id"] == member_user_id:
            raise HTTPException(status_code=400, detail="Cannot remove the bucket creator")

        is_creator = bucket["creator_id"] == actor_id
        is_self_removal = actor_id == member_user_id
        if not is_creator and not is_self_removal:
            raise HTTPException(status_code=403, detail="Only the creator can remove members unless a member is removing themselves")

        membership_response = (
            supabase.table("bucket_members")
            .select("id")
            .eq("bucket_id", bucket_id)
            .eq("user_id", member_user_id)
            .execute()
        )
        if not membership_response.data:
            raise HTTPException(status_code=404, detail="Bucket member not found")

        supabase.table("bucket_members").delete().eq("bucket_id", bucket_id).eq("user_id", member_user_id).execute()
        _sync_bucket_visibility(bucket_id)

        refreshed_bucket = supabase.table("buckets").select("*").eq("id", bucket_id).execute()
        bucket_details = _build_bucket_details(refreshed_bucket.data[0])
        return {"status": "success", "message": "Bucket member removed", "data": bucket_details}
    except HTTPException:
        raise
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