from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user_id, require_matching_user
from database import supabase
from schemas import BucketCommentCreate, BucketCommentUpdate


router = APIRouter(prefix="/api/bucket-comments", tags=["Bucket Comments"])


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


@router.get("/bucket/{bucket_id}")
async def get_bucket_comments(bucket_id: str, user_id: str, auth_user_id: str = Depends(get_current_user_id)):
    try:
        require_matching_user(auth_user_id, user_id)
        _require_bucket_access(bucket_id, user_id)
        response = (
            supabase.table("bucket_comments")
            .select("id, bucket_id, user_id, content, created_at, updated_at, users(id, display_name)")
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
async def create_bucket_comment(payload: BucketCommentCreate, auth_user_id: str = Depends(get_current_user_id)):
    try:
        require_matching_user(auth_user_id, payload.actor_id)
        _require_bucket_access(payload.bucket_id, payload.actor_id)
        response = supabase.table("bucket_comments").insert({
            "bucket_id": payload.bucket_id,
            "user_id": payload.actor_id,
            "content": payload.content,
        }).execute()
        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{comment_id}")
async def update_bucket_comment(comment_id: str, payload: BucketCommentUpdate, auth_user_id: str = Depends(get_current_user_id)):
    try:
        require_matching_user(auth_user_id, payload.actor_id)
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{comment_id}")
async def delete_bucket_comment(comment_id: str, actor_id: str, auth_user_id: str = Depends(get_current_user_id)):
    try:
        require_matching_user(auth_user_id, actor_id)
        comment_response = supabase.table("bucket_comments").select("*").eq("id", comment_id).execute()
        if not comment_response.data:
            raise HTTPException(status_code=404, detail="Comment not found")

        comment = comment_response.data[0]
        bucket = _get_bucket(comment["bucket_id"])
        if actor_id not in {comment.get("user_id"), bucket.get("creator_id")}:
            raise HTTPException(status_code=403, detail="Only the comment author or bucket creator can delete this comment")

        supabase.table("bucket_comments").delete().eq("id", comment_id).execute()
        return {"status": "success", "message": "Bucket comment deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))