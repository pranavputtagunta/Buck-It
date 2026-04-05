from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user_id, require_matching_user
from database import supabase

router = APIRouter(prefix="/api/bucket-list", tags=["Bucket List"])

class BucketListItemCreate(BaseModel):
    user_id: str
    title: str
    deadline: Optional[str] = None


class BucketListItemUpdate(BaseModel):
    title: Optional[str] = None
    deadline: Optional[str] = None

@router.post("/")
async def create_bucket_list_item(item: BucketListItemCreate, auth_user_id: str = Depends(get_current_user_id)):
    try:
        require_matching_user(auth_user_id, item.user_id)
        response = supabase.table("bucket_list_items").insert({
            "user_id": item.user_id,
            "title": item.title,
            "deadline": item.deadline
        }).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/item/{item_id}")
async def get_bucket_list_item(item_id: str, auth_user_id: str = Depends(get_current_user_id)):
    try:
        response = (
            supabase.table("bucket_list_items")
            .select("*")
            .eq("id", item_id)
            .eq("user_id", auth_user_id)
            .execute()
        )
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{user_id}")
async def get_bucket_list(user_id: str, auth_user_id: str = Depends(get_current_user_id)):
    try:
        require_matching_user(auth_user_id, user_id)
        response = supabase.table("bucket_list_items").select("*").eq("user_id", user_id).order("deadline").execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{item_id}")
async def update_bucket_list_item(item_id: str, item: BucketListItemUpdate, auth_user_id: str = Depends(get_current_user_id)):
    try:
        existing = (
            supabase.table("bucket_list_items")
            .select("user_id")
            .eq("id", item_id)
            .execute()
        )
        if not existing.data:
            raise HTTPException(status_code=404, detail="Bucket list item not found")
        require_matching_user(auth_user_id, existing.data[0]["user_id"])

        update_data = item.model_dump(exclude_none=True)
        response = supabase.table("bucket_list_items").update(update_data).eq("id", item_id).execute()
        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{item_id}")
async def delete_bucket_list_item(item_id: str, auth_user_id: str = Depends(get_current_user_id)):
    try:
        existing = (
            supabase.table("bucket_list_items")
            .select("user_id")
            .eq("id", item_id)
            .execute()
        )
        if not existing.data:
            raise HTTPException(status_code=404, detail="Bucket list item not found")
        require_matching_user(auth_user_id, existing.data[0]["user_id"])

        supabase.table("bucket_list_items").delete().eq("id", item_id).execute()
        return {"status": "success", "message": "Item deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))