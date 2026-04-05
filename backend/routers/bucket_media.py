from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from database import supabase
from schemas import BucketMediaCreate


router = APIRouter(prefix="/api/bucket-media", tags=["Bucket Media"])

_FALLBACK_BUCKET_MEDIA: list[dict] = []


def _get_bucket(bucket_id: str) -> dict:
    bucket_response = supabase.table("buckets").select("*").eq("id", bucket_id).execute()
    if not bucket_response.data:
        raise HTTPException(status_code=404, detail="Bucket not found")
    return bucket_response.data[0]


def _is_bucket_member(bucket_id: str, user_id: str) -> bool:
    membership_response = (
        supabase.table("bucket_members")
        .select("id")
        .eq("bucket_id", bucket_id)
        .eq("user_id", user_id)
        .execute()
    )
    return bool(membership_response.data)


def _require_bucket_access(bucket_id: str, user_id: str) -> dict:
    bucket = _get_bucket(bucket_id)
    if bucket.get("creator_id") == user_id or _is_bucket_member(bucket_id, user_id):
        return bucket
    raise HTTPException(status_code=403, detail="Only bucket members can access bucket media")


def _is_missing_media_table_error(exc: Exception) -> bool:
    message = str(exc)
    return "PGRST205" in message and "bucket_media" in message


def _get_user_summary(user_id: str) -> dict | None:
    user_response = supabase.table("users").select("id, display_name").eq("id", user_id).execute()
    if not user_response.data:
        return None
    return user_response.data[0]


@router.get("/bucket/{bucket_id}")
async def get_bucket_media(bucket_id: str, user_id: str):
    try:
        _require_bucket_access(bucket_id, user_id)
        try:
            response = (
                supabase.table("bucket_media")
                .select("id, bucket_id, user_id, media_type, public_url, storage_path, caption, created_at, users(id, display_name)")
                .eq("bucket_id", bucket_id)
                .order("created_at")
                .execute()
            )
            return {"status": "success", "data": response.data or []}
        except Exception as exc:
            if not _is_missing_media_table_error(exc):
                raise

            media = [item.copy() for item in _FALLBACK_BUCKET_MEDIA if item["bucket_id"] == bucket_id]
            media.sort(key=lambda item: item.get("created_at") or "")
            return {"status": "success", "data": media}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
async def create_bucket_media(payload: BucketMediaCreate):
    try:
        bucket = _require_bucket_access(payload.bucket_id, payload.actor_id)
        if bucket.get("status") != "active":
            raise HTTPException(status_code=400, detail="Media can only be added while a bucket is active")

        try:
            response = supabase.table("bucket_media").insert({
                "bucket_id": payload.bucket_id,
                "user_id": payload.actor_id,
                "media_type": payload.media_type,
                "public_url": payload.public_url,
                "storage_path": payload.storage_path,
                "caption": payload.caption,
            }).execute()
            return {"status": "success", "data": response.data}
        except Exception as exc:
            if not _is_missing_media_table_error(exc):
                raise

            media_item = {
                "id": str(uuid4()),
                "bucket_id": payload.bucket_id,
                "user_id": payload.actor_id,
                "media_type": payload.media_type,
                "public_url": payload.public_url,
                "storage_path": payload.storage_path,
                "caption": payload.caption,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "users": _get_user_summary(payload.actor_id),
            }
            _FALLBACK_BUCKET_MEDIA.append(media_item)
            return {"status": "success", "data": [media_item]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{media_id}")
async def delete_bucket_media(media_id: str, actor_id: str):
    try:
        try:
            media_response = supabase.table("bucket_media").select("*").eq("id", media_id).execute()
            if not media_response.data:
                raise HTTPException(status_code=404, detail="Bucket media not found")

            media_item = media_response.data[0]
            bucket = _get_bucket(media_item["bucket_id"])
            if actor_id not in {media_item.get("user_id"), bucket.get("creator_id")}:
                raise HTTPException(status_code=403, detail="Only the uploader or bucket creator can delete this media")

            supabase.table("bucket_media").delete().eq("id", media_id).execute()
            return {"status": "success", "message": "Bucket media deleted"}
        except Exception as exc:
            if not _is_missing_media_table_error(exc):
                raise

            index = next((i for i, item in enumerate(_FALLBACK_BUCKET_MEDIA) if item["id"] == media_id), None)
            if index is None:
                raise HTTPException(status_code=404, detail="Bucket media not found")
            media_item = _FALLBACK_BUCKET_MEDIA[index]
            bucket = _get_bucket(media_item["bucket_id"])
            if actor_id not in {media_item.get("user_id"), bucket.get("creator_id")}:
                raise HTTPException(status_code=403, detail="Only the uploader or bucket creator can delete this media")
            _FALLBACK_BUCKET_MEDIA.pop(index)
            return {"status": "success", "message": "Bucket media deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))