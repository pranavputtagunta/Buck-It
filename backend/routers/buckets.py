from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user_id, require_matching_user
from database import supabase
<<<<<<< HEAD
from schemas import BucketJoinRequest
=======
from services.llm_service import llm
from schemas import BucketCreate, BucketUpdate, BucketStatusUpdate, DiscoverFeedItem, BucketDisplay
>>>>>>> 1efdbf137a53b631dd4f44804adca853a5a61fca

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


def _ensure_bucket_membership(bucket_id: str, user_id: str, role: str = "member") -> None:
    membership_response = (
        supabase.table("bucket_members")
        .select("id")
        .eq("bucket_id", bucket_id)
        .eq("user_id", user_id)
        .execute()
    )

    if membership_response.data:
        return

    supabase.table("bucket_members").insert({
        "bucket_id": bucket_id,
        "user_id": user_id,
        "role": role,
    }).execute()


def _is_bucket_member(bucket_id: str, user_id: str) -> bool:
    membership_response = (
        supabase.table("bucket_members")
        .select("id")
        .eq("bucket_id", bucket_id)
        .eq("user_id", user_id)
        .execute()
    )
    return bool(membership_response.data)


def _tokenize_interest_text(value: str) -> set[str]:
    normalized = "".join(char.lower() if char.isalnum() else " " for char in value)
    return {token for token in normalized.split() if len(token) >= 3}


def _score_bucket_for_user(bucket: dict, bucket_list_titles: list[str]) -> int:
    bucket_tokens = _tokenize_interest_text(f"{bucket.get('title', '')} {bucket.get('category', '')}")
    score = 0

    for title in bucket_list_titles:
        title_tokens = _tokenize_interest_text(title)
        if not title_tokens:
            continue
        overlap = bucket_tokens.intersection(title_tokens)
        score += len(overlap)

    return score


@router.get("/")
async def get_all_buckets(_auth_user_id: str = Depends(get_current_user_id)):
    try:
        response = supabase.table("buckets").select("*").order("created_at", desc=True).execute()
        buckets = [_build_bucket_details(bucket) for bucket in (response.data or [])]
        return {"status": "success", "data": buckets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/feed/global")
async def get_global_feed(_auth_user_id: str = Depends(get_current_user_id)):
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


@router.get("/discover/{user_id}")
async def get_discover_feed(user_id: str, auth_user_id: str = Depends(get_current_user_id)):
    """Fetches upcoming public/shared buckets, ranked by the user's bucket list interests."""
    try:
        require_matching_user(auth_user_id, user_id)
        membership_response = (
            supabase.table("bucket_members")
            .select("bucket_id")
            .eq("user_id", user_id)
            .execute()
        )
        joined_bucket_ids = {row["bucket_id"] for row in (membership_response.data or [])}

        bucket_list_response = (
            supabase.table("bucket_list_items")
            .select("title")
            .eq("user_id", user_id)
            .execute()
        )
        bucket_list_titles = [row.get("title", "") for row in (bucket_list_response.data or [])]

        now_iso = datetime.now(timezone.utc).isoformat()
        response = (
            supabase.table("buckets")
            .select("*")
            .in_("status", ["planned", "active"])
            .in_("visibility", ["public", "shared"])
            .gte("event_time", now_iso)
            .order("event_time")
            .limit(50)
            .execute()
        )

        candidate_buckets = []
        for bucket in response.data or []:
            if bucket["id"] in joined_bucket_ids:
                continue
            candidate_buckets.append(bucket)

        ranked_buckets = sorted(
            candidate_buckets,
            key=lambda bucket: (
                -_score_bucket_for_user(bucket, bucket_list_titles),
                bucket.get("event_time") or "",
            ),
        )
        buckets = [_build_bucket_details(bucket) for bucket in ranked_buckets]
        return {"status": "success", "data": buckets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}")
async def get_user_buckets(user_id: str, auth_user_id: str = Depends(get_current_user_id)):
    """Fetches all buckets for a specific user."""
    try:
        require_matching_user(auth_user_id, user_id)
        membership_response = (
            supabase.table("bucket_members")
            .select("bucket_id")
            .eq("user_id", user_id)
            .execute()
        )
        bucket_ids = {row["bucket_id"] for row in (membership_response.data or [])}

        creator_response = (
            supabase.table("buckets")
            .select("id")
            .eq("creator_id", user_id)
            .execute()
        )
        bucket_ids.update(row["id"] for row in (creator_response.data or []))

        if not bucket_ids:
            return {"status": "success", "data": []}

        response = supabase.table("buckets").select("*").in_("id", list(bucket_ids)).order("created_at", desc=True).execute()
        buckets = [_build_bucket_details(bucket) for bucket in (response.data or [])]
        return {"status": "success", "data": buckets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{bucket_id}")
async def get_bucket(bucket_id: str, auth_user_id: str = Depends(get_current_user_id)):
    try:
        response = supabase.table("buckets").select("*").eq("id", bucket_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Bucket not found")

        bucket = response.data[0]
        if bucket.get("visibility") == "private" and not _is_bucket_member(bucket_id, auth_user_id):
            raise HTTPException(status_code=403, detail="You do not have access to this bucket")

        bucket = _build_bucket_details(bucket)
        return {"status": "success", "data": bucket}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_bucket(bucket: BucketCreate, auth_user_id: str = Depends(get_current_user_id)):
    try:
        require_matching_user(auth_user_id, bucket.creator_id)
        response = supabase.table("buckets").insert({
            "creator_id": bucket.creator_id,
            "title": bucket.title,
            "category": bucket.category,
            "event_time": bucket.event_time,
            "status": bucket.status,
            "visibility": bucket.visibility,
        }).execute()

        if not response.data:
            raise HTTPException(status_code=500, detail="Bucket creation failed")

        created_bucket = response.data[0]

        try:
            _ensure_bucket_membership(created_bucket["id"], bucket.creator_id, role="creator")
        except Exception:
            supabase.table("buckets").delete().eq("id", created_bucket["id"]).execute()
            raise

        refreshed_bucket = _get_bucket_row(created_bucket["id"])
        return {"status": "success", "data": _build_bucket_details(refreshed_bucket)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{bucket_id}")
async def update_bucket(bucket_id: str, update: BucketUpdate, auth_user_id: str = Depends(get_current_user_id)):
    try:
        require_matching_user(auth_user_id, update.actor_id)
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
async def update_bucket_status(bucket_id: str, update: BucketStatusUpdate, auth_user_id: str = Depends(get_current_user_id)):
    """Moves a bucket from Planned -> Active -> Completed."""
    try:
        require_matching_user(auth_user_id, update.actor_id)
        _require_bucket_creator(bucket_id, update.actor_id)
        response = supabase.table("buckets").update({"status": update.status}).eq("id", bucket_id).execute()
        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{bucket_id}")
async def delete_bucket(bucket_id: str, actor_id: str, auth_user_id: str = Depends(get_current_user_id)):
    try:
        require_matching_user(auth_user_id, actor_id)
        _require_bucket_creator(bucket_id, actor_id)
        supabase.table("buckets").delete().eq("id", bucket_id).execute()
        return {"status": "success", "message": "Bucket deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{bucket_id}/join")
async def join_bucket(bucket_id: str, payload: BucketJoinRequest, auth_user_id: str = Depends(get_current_user_id)):
    try:
        require_matching_user(auth_user_id, payload.actor_id)
        bucket = _get_bucket_row(bucket_id)
        if bucket.get("visibility") == "private":
            raise HTTPException(status_code=403, detail="Private buckets require an invitation")

        _ensure_bucket_membership(bucket_id, payload.actor_id)
        _sync_bucket_visibility(bucket_id)

        refreshed_bucket = _get_bucket_row(bucket_id)
        return {
            "status": "success",
            "message": "Joined bucket successfully",
            "data": _build_bucket_details(refreshed_bucket),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{bucket_id}/members/{member_user_id}")
async def remove_bucket_member(bucket_id: str, member_user_id: str, actor_id: str, auth_user_id: str = Depends(get_current_user_id)):
    try:
        require_matching_user(auth_user_id, actor_id)
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