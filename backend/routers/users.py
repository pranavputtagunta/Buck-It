from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import supabase
from schemas import BadgeUpdate, UserCreate, UserUpdate

# All routes here automatically start with /api/users
router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("/{user_id}")
async def get_user(user_id: str):
    """Fetches a user's profile and their badges."""
    try:
        response = supabase.table("users").select("*").eq("id", user_id).execute()
        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{user_id}/badges")
async def update_user_badges(user_id: str, update: BadgeUpdate):
    """Updates a user's credibility badges."""
    try:
        response = supabase.table("users").update({"badges": update.badges}).eq("id", user_id).execute()
        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{user_id}")
async def update_user(user_id: str, update: UserUpdate):
    """Updates mutable user profile fields in the users table."""
    try:
        update_data = update.model_dump(exclude_none=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No user fields provided to update")

        response = supabase.table("users").update(update_data).eq("id", user_id).execute()
        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_user(user: UserCreate):
    """Creates a user row if one does not already exist."""

    try:
        user_response = supabase.table("users").insert({
            "id": user.id,
            "display_name": user.display_name,
            "location": user.location,
            "badges": []
        }).execute()

        return {"status": "success", "data": user_response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
class BucketItem(BaseModel):
    title: str
    category: str
    deadline: Optional[str] = None

class ProfileCreate(BaseModel):
    id: str
    username: str
    personality: str
    hobbies: List[str]
    location: Optional[str] = None
    bucket_list: List[BucketItem]
    onboarding_data: Dict[str, Any]

@router.post("/profile")
async def create_or_update_profile(profile: ProfileCreate):
    """Upserts user profile basics and syncs onboarding bucket-list items."""

    try:
        user_table_payload = {
            "id": profile.id,
            "display_name": profile.username,
            "location": profile.location if profile.location else None,
        }

        supabase.table("users").upsert(user_table_payload).execute()

        # Keep this endpoint idempotent by replacing onboarding-generated items.
        supabase.table("bucket_list_items").delete().eq("user_id", profile.id).execute()

        if profile.bucket_list:
            items_to_insert = [
                {
                    "user_id": profile.id,
                    "title": item.title,
                    "deadline": item.deadline if item.deadline and item.deadline.strip() else None,
                }
                for item in profile.bucket_list
            ]

            supabase.table("bucket_list_items").insert(items_to_insert).execute()

        return {"status": "success"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AvailabilityUpdate(BaseModel):
    user_id: str
    available_slots: List[str]  # e.g., ["Mon-08:00", "Wed-14:00"]

@router.post("/availability")
async def update_availability(data: AvailabilityUpdate):
    """Upserts a user's availability matrix in the availabilities table."""
    try:
        response = supabase.table("availabilities").upsert(
            {
                "user_id": data.user_id,
                "available_slots": data.available_slots,
            }
        ).execute()

        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))