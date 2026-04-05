from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user_id, require_matching_user
from database import supabase
from schemas import BucketMediaCreate, BucketMediaDelete


router = APIRouter(prefix="/api/bucket-media", tags=["Bucket Media"])


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


@router.get("/bucket/{bucket_id}")
async def get_bucket_media(bucket_id: str, user_id: str, auth_user_id: str = Depends(get_current_user_id)):
    try:
        require_matching_user(auth_user_id, user_id)
        _require_bucket_access(bucket_id, user_id)
        response = (
            supabase.table("bucket_media")
            .select("id, bucket_id, user_id, media_type, public_url, storage_path, caption, created_at, users(id, display_name)")
            .eq("bucket_id", bucket_id)
            .order("created_at")
            .execute()
        )
        return {"status": "success", "data": response.data or []}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
async def create_bucket_media(payload: BucketMediaCreate, auth_user_id: str = Depends(get_current_user_id)):
    try:
        require_matching_user(auth_user_id, payload.actor_id)
        bucket = _require_bucket_access(payload.bucket_id, payload.actor_id)
        if bucket.get("status") != "active":
            raise HTTPException(status_code=400, detail="Media can only be added while a bucket is active")

        response = supabase.table("bucket_media").insert({
            "bucket_id": payload.bucket_id,
            "user_id": payload.actor_id,
            "media_type": payload.media_type,
            "public_url": payload.public_url,
            "storage_path": payload.storage_path,
            "caption": payload.caption,
        }).execute()
        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{media_id}")
async def delete_bucket_media(media_id: str, actor_id: str, auth_user_id: str = Depends(get_current_user_id)):
    try:
        require_matching_user(auth_user_id, actor_id)
        media_response = supabase.table("bucket_media").select("*").eq("id", media_id).execute()
        if not media_response.data:
            raise HTTPException(status_code=404, detail="Bucket media not found")

        media_item = media_response.data[0]
        bucket = _get_bucket(media_item["bucket_id"])
        if actor_id not in {media_item.get("user_id"), bucket.get("creator_id")}:
            raise HTTPException(status_code=403, detail="Only the uploader or bucket creator can delete this media")

        supabase.table("bucket_media").delete().eq("id", media_id).execute()
        return {"status": "success", "message": "Bucket media deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))