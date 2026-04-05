from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from database import supabase
from services.llm_service import llm
from services.category_badge_service import normalize_bucket_category, recalculate_user_badges
from schemas import (
    BucketAcceptDiscoverRequest,
    BucketCloneRequest,
    BucketCreate,
    BucketDisplay,
    BucketJoinRequest,
    BucketStatusUpdate,
    BucketUpdate,
)

router = APIRouter(prefix="/api/buckets", tags=["Buckets"])
BUCKET_LIST_ITEM_NOT_FOUND = "Bucket list item not found for this user"

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


def _generate_ai_discover_buckets(user_id: str, user_goals: list[dict]) -> list[dict]:
    user_response = supabase.table("users").select("location").eq("id", user_id).execute()
    user_location = "San Diego"
    if user_response.data:
        first_row = user_response.data[0]
        if isinstance(first_row, dict):
            user_location = first_row.get("location") or "San Diego"

    goals_context = user_goals or [{"title": "Explore local activities", "deadline": None}]
    system_prompt = (
        "You are the Bucket App discover engine. Generate exactly 8 NEW bucket ideas the user can add "
        "to their own plans. Do not include already completed activities. "
        "Use practical, near-term suggestions and set status to planned. "
        "Use one of these exact categories for every item: Health & Fitness, Travel & Adventure, "
        "Career & Skills, Creative & Art, Social & Nightlife, Relaxation. "
        f"Anchor suggestions to this city: {user_location}."
    )

    ai_rows = llm.generate_structured_response(
        system_instruction=system_prompt,
        user_prompt="Generate discover suggestions.",
        response_schema=list[BucketDisplay],
        user_context={"user_goals": goals_context, "location": user_location},
    )

    if not isinstance(ai_rows, list):
        return []

    normalized_rows = []
    for row in ai_rows:
        if not isinstance(row, dict):
            continue
        category_value = row.get("category") or ""
        try:
            normalized_category = normalize_bucket_category(category_value)
        except HTTPException:
            normalized_category = "Travel & Adventure"

        normalized_rows.append(
            {
                "title": row.get("title"),
                "category": normalized_category,
                "description": row.get("description"),
                "location": row.get("location") or user_location,
                "event_time": row.get("event_time"),
                "estimated_cost": row.get("estimated_cost"),
                "link": row.get("link"),
                "image_keyword": row.get("image_keyword"),
                "status": "planned",
            }
        )

    if normalized_rows:
        return normalized_rows[:8]

    fallback_rows = [
        {
            "title": "Find a scenic sunset walk",
            "category": "Relaxation",
            "description": f"Take an evening walk and discover a scenic route in {user_location}.",
            "location": user_location,
            "event_time": None,
            "estimated_cost": "$",
            "link": None,
            "image_keyword": user_location,
            "status": "planned",
        },
        {
            "title": "Try a new local fitness class",
            "category": "Health & Fitness",
            "description": f"Join a beginner-friendly class in {user_location} and invite a friend.",
            "location": user_location,
            "event_time": None,
            "estimated_cost": "$$",
            "link": None,
            "image_keyword": user_location,
            "status": "planned",
        },
        {
            "title": "Visit a neighborhood museum or gallery",
            "category": "Creative & Art",
            "description": f"Explore a museum or art gallery in {user_location} this week.",
            "location": user_location,
            "event_time": None,
            "estimated_cost": "$$",
            "link": None,
            "image_keyword": user_location,
            "status": "planned",
        },
    ]

    return fallback_rows


@router.get("/")
async def get_all_buckets():
    try:
        response = supabase.table("buckets").select("*").order("created_at", desc=True).execute()
        buckets = [_build_bucket_details(bucket) for bucket in (response.data or [])]
        return {"status": "success", "data": buckets}
    except HTTPException:
        raise
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/discover/{user_id}")
async def get_discover_feed(user_id: str):
    """Fetches upcoming public/shared buckets, ranked by the user's bucket list interests."""
    try:
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/discover-generated/{user_id}")
async def get_discover_generated_feed(user_id: str):
    """Generates discover suggestions with Gemini based on the user's goals."""
    try:
        user_goals_response = (
            supabase.table("bucket_list_items")
            .select("title, deadline")
            .eq("user_id", user_id)
            .execute()
        )
        user_goals = user_goals_response.data or []
        discover_suggestions = _generate_ai_discover_buckets(user_id, user_goals)

        return {
            "status": "success",
            "data": discover_suggestions,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/discover-page/{user_id}")
async def get_discover_page(user_id: str):
    """Returns both completed social posts and AI discover suggestions for the Discover page."""
    try:
        completed_posts_response = (
            supabase.table("buckets")
            .select("*")
            .eq("status", "completed")
            .in_("visibility", ["shared", "public"])
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        completed_posts = [_build_bucket_details(bucket) for bucket in (completed_posts_response.data or [])]

        user_goals_response = (
            supabase.table("bucket_list_items")
            .select("title, deadline")
            .eq("user_id", user_id)
            .execute()
        )
        user_goals = user_goals_response.data or []
        discover_suggestions = _generate_ai_discover_buckets(user_id, user_goals)

        return {
            "status": "success",
            "data": {
                "completed_posts": completed_posts,
                "discover_suggestions": discover_suggestions,
            },
        }
    except HTTPException:
        raise
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}/grouped")
async def get_user_buckets_grouped(user_id: str):
    """Returns owned, joined, and invited buckets in separate groups for gallery tabs."""
    try:
        owned_response = (
            supabase.table("buckets")
            .select("*")
            .eq("creator_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        owned_buckets = [_build_bucket_details(bucket) for bucket in (owned_response.data or [])]

        joined_memberships_response = (
            supabase.table("bucket_members")
            .select("bucket_id")
            .eq("user_id", user_id)
            .execute()
        )
        joined_ids = {
            row["bucket_id"]
            for row in (joined_memberships_response.data or [])
            if isinstance(row, dict) and row.get("bucket_id")
        }

        owned_ids = {bucket.get("id") for bucket in owned_buckets if isinstance(bucket, dict) and bucket.get("id")}
        joined_only_ids = list(joined_ids - owned_ids)

        joined_buckets = []
        if joined_only_ids:
            joined_response = (
                supabase.table("buckets")
                .select("*")
                .in_("id", joined_only_ids)
                .order("created_at", desc=True)
                .execute()
            )
            joined_buckets = [_build_bucket_details(bucket) for bucket in (joined_response.data or [])]

        invitations_response = (
            supabase.table("bucket_invitations")
            .select("id, bucket_id, inviter_id, status, created_at")
            .eq("invitee_id", user_id)
            .eq("status", "pending")
            .order("created_at", desc=True)
            .execute()
        )
        pending_invitations = invitations_response.data or []
        invited_ids = list({row.get("bucket_id") for row in pending_invitations if isinstance(row, dict) and row.get("bucket_id")})

        invited_buckets = []
        if invited_ids:
            invited_response = (
                supabase.table("buckets")
                .select("*")
                .in_("id", invited_ids)
                .order("created_at", desc=True)
                .execute()
            )
            invited_buckets = [_build_bucket_details(bucket) for bucket in (invited_response.data or [])]

        return {
            "status": "success",
            "data": {
                "owned": owned_buckets,
                "joined": joined_buckets,
                "invited": invited_buckets,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{bucket_id}")
async def get_bucket(bucket_id: str):
    try:
        response = supabase.table("buckets").select("*").eq("id", bucket_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Bucket not found")

        bucket = response.data[0]
        bucket = _build_bucket_details(bucket)
        return {"status": "success", "data": bucket}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_bucket(bucket: BucketCreate):
    try:
        normalized_category = normalize_bucket_category(bucket.category)

        if bucket.bucket_list_item_id:
            bucket_item_response = (
                supabase.table("bucket_list_items")
                .select("id")
                .eq("id", bucket.bucket_list_item_id)
                .eq("user_id", bucket.creator_id)
                .execute()
            )
            if not bucket_item_response.data:
                raise HTTPException(status_code=404, detail=BUCKET_LIST_ITEM_NOT_FOUND)

        response = supabase.table("buckets").insert({
            "creator_id": bucket.creator_id,
            "bucket_list_item_id": bucket.bucket_list_item_id,
            "title": bucket.title,
            "category": normalized_category,
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
        if refreshed_bucket.get("status") == "completed":
            recalculate_user_badges(bucket.creator_id)

        return {"status": "success", "data": _build_bucket_details(refreshed_bucket)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{bucket_id}")
async def update_bucket(bucket_id: str, update: BucketUpdate):
    try:
        _require_bucket_creator(bucket_id, update.actor_id)
        update_data = update.model_dump(exclude_none=True, exclude={"actor_id"})
        if not update_data:
            raise HTTPException(status_code=400, detail="No bucket fields provided to update")

        if "category" in update_data:
            update_data["category"] = normalize_bucket_category(update_data["category"])

        if "bucket_list_item_id" in update_data and update_data["bucket_list_item_id"]:
            bucket_item_response = (
                supabase.table("bucket_list_items")
                .select("id")
                .eq("id", update_data["bucket_list_item_id"])
                .eq("user_id", update.actor_id)
                .execute()
            )
            if not bucket_item_response.data:
                raise HTTPException(status_code=404, detail=BUCKET_LIST_ITEM_NOT_FOUND)

        response = supabase.table("buckets").update(update_data).eq("id", bucket_id).execute()
        if "category" in update_data:
            recalculate_user_badges(update.actor_id)
        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{bucket_id}/status")
async def update_bucket_status(bucket_id: str, update: BucketStatusUpdate):
    """Moves a bucket from Planned -> Active -> Completed."""
    try:
        bucket = _require_bucket_creator(bucket_id, update.actor_id)
        response = supabase.table("buckets").update({"status": update.status}).eq("id", bucket_id).execute()

        if update.status == "completed" or bucket.get("status") == "completed":
            recalculate_user_badges(update.actor_id)

        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{bucket_id}")
async def delete_bucket(bucket_id: str, actor_id: str):
    try:
        existing_bucket = _require_bucket_creator(bucket_id, actor_id)
        supabase.table("buckets").delete().eq("id", bucket_id).execute()

        if existing_bucket.get("status") == "completed":
            recalculate_user_badges(actor_id)

        return {"status": "success", "message": "Bucket deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{bucket_id}/join")
async def join_bucket(bucket_id: str, payload: BucketJoinRequest):
    try:
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


@router.post("/accept-discover")
async def accept_discover_bucket(payload: BucketAcceptDiscoverRequest):
    """Persist an AI discover suggestion as a planned bucket for the user."""
    try:
        normalized_category = normalize_bucket_category(payload.category)

        if payload.bucket_list_item_id:
            bucket_item_response = (
                supabase.table("bucket_list_items")
                .select("id")
                .eq("id", payload.bucket_list_item_id)
                .eq("user_id", payload.actor_id)
                .execute()
            )
            if not bucket_item_response.data:
                raise HTTPException(status_code=404, detail=BUCKET_LIST_ITEM_NOT_FOUND)

        insert_response = supabase.table("buckets").insert(
            {
                "creator_id": payload.actor_id,
                "bucket_list_item_id": payload.bucket_list_item_id,
                "title": payload.title,
                "category": normalized_category,
                "event_time": payload.event_time,
                "status": "planned",
                "visibility": payload.visibility,
            }
        ).execute()

        if not insert_response.data:
            raise HTTPException(status_code=500, detail="Discover bucket acceptance failed")

        created_bucket = insert_response.data[0]
        _ensure_bucket_membership(created_bucket["id"], payload.actor_id, role="creator")
        refreshed_bucket = _get_bucket_row(created_bucket["id"])
        return {"status": "success", "data": _build_bucket_details(refreshed_bucket)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{bucket_id}/clone")
async def clone_bucket(bucket_id: str, payload: BucketCloneRequest):
    """Clone an existing bucket into a new planned bucket for the requesting user."""
    try:
        source_bucket = _get_bucket_row(bucket_id)

        if source_bucket.get("status") != "completed":
            raise HTTPException(status_code=400, detail="Only completed buckets can be cloned")

        if source_bucket.get("visibility") == "private":
            raise HTTPException(status_code=403, detail="Private buckets cannot be cloned")

        normalized_category = normalize_bucket_category(source_bucket.get("category") or "")

        insert_response = supabase.table("buckets").insert({
            "creator_id": payload.actor_id,
            "bucket_list_item_id": source_bucket.get("bucket_list_item_id"),
            "title": source_bucket.get("title"),
            "category": normalized_category,
            "event_time": payload.event_time,
            "status": "planned",
            "visibility": payload.visibility,
        }).execute()

        if not insert_response.data:
            raise HTTPException(status_code=500, detail="Bucket clone failed")

        cloned_bucket = insert_response.data[0]

        try:
            _ensure_bucket_membership(cloned_bucket["id"], payload.actor_id, role="creator")
        except Exception:
            supabase.table("buckets").delete().eq("id", cloned_bucket["id"]).execute()
            raise

        refreshed_bucket = _get_bucket_row(cloned_bucket["id"])
        return {
            "status": "success",
            "message": "Bucket cloned successfully",
            "data": _build_bucket_details(refreshed_bucket),
        }
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


@router.get("/list-item/{bucket_list_item_id}")
async def get_buckets_for_list_item(bucket_list_item_id: str):
    try:
        response = (
            supabase.table("buckets")
            .select("*")
            .eq("bucket_list_item_id", bucket_list_item_id)
            .order("event_time")
            .execute()
        )
        buckets = [_build_bucket_details(bucket) for bucket in (response.data or [])]
        return {"status": "success", "data": buckets}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
