from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from database import supabase
from schemas import BucketCommentCreate, BucketCommentUpdate


router = APIRouter(prefix="/api/bucket-comments", tags=["Bucket Comments"])

_FALLBACK_BUCKET_COMMENTS: list[dict] = []


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
    if bucket.get("visibility") != "private" or bucket.get("creator_id") == user_id or _is_bucket_member(bucket_id, user_id):
        return bucket
    raise HTTPException(status_code=403, detail="You do not have access to this bucket")


def _is_missing_comments_table_error(exc: Exception) -> bool:
    message = str(exc)
    return "PGRST205" in message and "bucket_comments" in message


def _get_user_summary(user_id: str) -> dict | None:
    user_response = supabase.table("users").select("id, display_name").eq("id", user_id).execute()
    if not user_response.data:
        return None
    return user_response.data[0]


@router.get("/bucket/{bucket_id}")
async def get_bucket_comments(bucket_id: str, user_id: str):
    try:
        _require_bucket_access(bucket_id, user_id)
        try:
            response = (
                supabase.table("bucket_comments")
                .select("id, bucket_id, user_id, content, created_at, updated_at, users(id, display_name)")
                .eq("bucket_id", bucket_id)
                .order("created_at")
                .execute()
            )
            return {"status": "success", "data": response.data or []}
        except Exception as exc:
            if not _is_missing_comments_table_error(exc):
                raise

            comments = [comment.copy() for comment in _FALLBACK_BUCKET_COMMENTS if comment["bucket_id"] == bucket_id]
            comments.sort(key=lambda item: item.get("created_at") or "")
            return {"status": "success", "data": comments}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
async def create_bucket_comment(payload: BucketCommentCreate):
    try:
        _require_bucket_access(payload.bucket_id, payload.actor_id)
        try:
            response = supabase.table("bucket_comments").insert({
                "bucket_id": payload.bucket_id,
                "user_id": payload.actor_id,
                "content": payload.content,
            }).execute()
            return {"status": "success", "data": response.data}
        except Exception as exc:
            if not _is_missing_comments_table_error(exc):
                raise

            created_at = datetime.now(timezone.utc).isoformat()
            comment = {
                "id": str(uuid4()),
                "bucket_id": payload.bucket_id,
                "user_id": payload.actor_id,
                "content": payload.content,
                "created_at": created_at,
                "updated_at": created_at,
                "users": _get_user_summary(payload.actor_id),
            }
            _FALLBACK_BUCKET_COMMENTS.append(comment)
            return {"status": "success", "data": [comment]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{comment_id}")
async def update_bucket_comment(comment_id: str, payload: BucketCommentUpdate):
    try:
        try:
            comment_response = supabase.table("bucket_comments").select("*").eq("id", comment_id).execute()
            if not comment_response.data:
                raise HTTPException(status_code=404, detail="Comment not found")

            comment = comment_response.data[0]
            if comment.get("user_id") != payload.actor_id:
                raise HTTPException(status_code=403, detail="Only the comment author can edit this comment")

            response = (
                supabase.table("bucket_comments")
                .update({"content": payload.content})
                .eq("id", comment_id)
                .execute()
            )
            return {"status": "success", "data": response.data}
        except Exception as exc:
            if not _is_missing_comments_table_error(exc):
                raise

            comment = next((item for item in _FALLBACK_BUCKET_COMMENTS if item["id"] == comment_id), None)
            if not comment:
                raise HTTPException(status_code=404, detail="Comment not found")
            if comment.get("user_id") != payload.actor_id:
                raise HTTPException(status_code=403, detail="Only the comment author can edit this comment")
            comment["content"] = payload.content
            comment["updated_at"] = datetime.now(timezone.utc).isoformat()
            return {"status": "success", "data": [comment.copy()]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{comment_id}")
async def delete_bucket_comment(comment_id: str, actor_id: str):
    try:
        try:
            comment_response = supabase.table("bucket_comments").select("*").eq("id", comment_id).execute()
            if not comment_response.data:
                raise HTTPException(status_code=404, detail="Comment not found")

            comment = comment_response.data[0]
            bucket = _get_bucket(comment["bucket_id"])
            if actor_id not in {comment.get("user_id"), bucket.get("creator_id")}:
                raise HTTPException(status_code=403, detail="Only the comment author or bucket creator can delete this comment")

            supabase.table("bucket_comments").delete().eq("id", comment_id).execute()
            return {"status": "success", "message": "Bucket comment deleted"}
        except Exception as exc:
            if not _is_missing_comments_table_error(exc):
                raise

            index = next((i for i, item in enumerate(_FALLBACK_BUCKET_COMMENTS) if item["id"] == comment_id), None)
            if index is None:
                raise HTTPException(status_code=404, detail="Comment not found")
            comment = _FALLBACK_BUCKET_COMMENTS[index]
            bucket = _get_bucket(comment["bucket_id"])
            if actor_id not in {comment.get("user_id"), bucket.get("creator_id")}:
                raise HTTPException(status_code=403, detail="Only the comment author or bucket creator can delete this comment")
            _FALLBACK_BUCKET_COMMENTS.pop(index)
            return {"status": "success", "message": "Bucket comment deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))