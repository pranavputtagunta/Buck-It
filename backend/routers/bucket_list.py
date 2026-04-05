from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import supabase
from schemas import BucketListItemCreate, BucketListItemUpdate

router = APIRouter(prefix="/api/bucket-list", tags=["Bucket List"])

@router.post("/")
async def create_bucket_list_item(item: BucketListItemCreate):
    try:
        response = supabase.table("bucket_list_items").insert({
            "user_id": item.user_id,
            "title": item.title,
            "deadline": item.deadline
        }).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/item/{item_id}")
async def get_bucket_list_item(item_id: str):
    try:
        response = supabase.table("bucket_list_items").select("*").eq("id", item_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{user_id}")
async def get_bucket_list(user_id: str):
    try:
        response = supabase.table("bucket_list_items").select("*").eq("user_id", user_id).order("deadline").execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{item_id}")
async def update_bucket_list_item(item_id: str, item: BucketListItemUpdate):
    try:
        update_data = item.model_dump(exclude_none=True)
        response = supabase.table("bucket_list_items").update(update_data).eq("id", item_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{item_id}")
async def delete_bucket_list_item(item_id: str):
    try:
        supabase.table("bucket_list_items").delete().eq("id", item_id).execute()
        return {"status": "success", "message": "Item deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))