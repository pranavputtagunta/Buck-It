from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import supabase
from schemas import BucketListBulkCreate, BucketListItemCreate, BucketListItemUpdate

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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bulk")
async def create_bucket_list_items_bulk(payload: BucketListBulkCreate):
    try:
        incoming_goals = [*payload.accepted_goals, *payload.custom_goals]
        if not incoming_goals:
            raise HTTPException(status_code=400, detail="No goals provided")

        rows = []
        seen_titles: set[str] = set()
        for goal in incoming_goals:
            normalized_title = goal.title.strip()
            if not normalized_title:
                continue

            dedupe_key = normalized_title.lower()
            if dedupe_key in seen_titles:
                continue

            seen_titles.add(dedupe_key)
            rows.append(
                {
                    "user_id": payload.user_id,
                    "title": normalized_title,
                    "deadline": goal.deadline,
                }
            )

        if not rows:
            raise HTTPException(status_code=400, detail="Goals are empty after validation")

        response = supabase.table("bucket_list_items").insert(rows).execute()
        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/item/{item_id}")
async def get_bucket_list_item(item_id: str):
    try:
        response = (
            supabase.table("bucket_list_items")
            .select("*")
            .eq("id", item_id)
            .execute()
        )
        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{user_id}")
async def get_bucket_list(user_id: str):
    try:
        response = supabase.table("bucket_list_items").select("*").eq("user_id", user_id).order("deadline").execute()
        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{item_id}")
async def update_bucket_list_item(item_id: str, item: BucketListItemUpdate):
    try:
        existing = (
            supabase.table("bucket_list_items")
            .select("user_id")
            .eq("id", item_id)
            .execute()
        )
        if not existing.data:
            raise HTTPException(status_code=404, detail="Bucket list item not found")

        update_data = item.model_dump(exclude_none=True)
        response = supabase.table("bucket_list_items").update(update_data).eq("id", item_id).execute()
        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{item_id}")
async def delete_bucket_list_item(item_id: str):
    try:
        existing = (
            supabase.table("bucket_list_items")
            .select("user_id")
            .eq("id", item_id)
            .execute()
        )
        if not existing.data:
            raise HTTPException(status_code=404, detail="Bucket list item not found")

        supabase.table("bucket_list_items").delete().eq("id", item_id).execute()
        return {"status": "success", "message": "Item deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))