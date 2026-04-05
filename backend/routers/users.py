from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from database import supabase
from schemas import BadgeUpdate, UserCreate, UserUpdate

# All routes here automatically start with /api/users
router = APIRouter(prefix="/api/users", tags=["Users"])

class BucketItem(BaseModel):
    title: str = ""
    category: str = ""
    deadline: Optional[str] = None

class ProfileCreate(BaseModel):
    id: str
    username: str = ""
    personality: str = ""
    location: Optional[str] = ""
    # Support both names to prevent 422 errors if one is missing
    hobbies: List[str] = Field(default_factory=list)
    interests: List[str] = Field(default_factory=list)
    bucket_list: List[BucketItem] = Field(default_factory=list)
    onboarding_data: Dict[str, Any] = Field(default_factory=dict)

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

@router.post("/profile")
async def create_or_update_profile(profile: ProfileCreate):
    """Upserts user profile basics and personality/interests columns."""
    try:
        # Determine which list has the actual data
        final_interests = profile.interests if profile.interests else profile.hobbies

        user_table_payload = {
            "id": profile.id,
            "display_name": profile.username,
            "location": profile.location,
            "personality": profile.personality,
            "interests": final_interests,
        }

        # Sync to public.users table
        supabase.table("users").upsert(user_table_payload).execute()

        return {"status": "success"}

    except Exception as e:
        print(f"❌ PROFILE SYNC ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class AvailabilityUpdate(BaseModel):
    user_id: str
    available_slots: List[str]

@router.post("/availability")
async def update_availability(data: AvailabilityUpdate):
    """Upserts a user's availability matrix."""
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