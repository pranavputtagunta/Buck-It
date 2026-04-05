from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from auth import get_current_user_id, require_matching_user
from database import supabase
from schemas import UserUpdate

# All routes here automatically start with /api/users
router = APIRouter(prefix="/api/users", tags=["Users"])

class BadgeUpdate(BaseModel):
    badges: List[str]
    
class UserCreate(BaseModel):
    id: str
    display_name: str
    location: str = "San Diego"

@router.get("/{user_id}")
async def get_user(user_id: str, auth_user_id: str = Depends(get_current_user_id)):
    """Fetches a user's profile and their badges."""
    try:
        require_matching_user(auth_user_id, user_id)
        response = supabase.table("users").select("*").eq("id", user_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{user_id}/badges")
async def update_user_badges(user_id: str, update: BadgeUpdate, auth_user_id: str = Depends(get_current_user_id)):
    """Updates a user's credibility badges."""
    try:
        require_matching_user(auth_user_id, user_id)
        response = supabase.table("users").update({"badges": update.badges}).eq("id", user_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{user_id}")
async def update_user(user_id: str, update: UserUpdate, auth_user_id: str = Depends(get_current_user_id)):
    try:
        require_matching_user(auth_user_id, user_id)
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
async def add_user_badge(user: UserCreate, auth_user_id: str = Depends(get_current_user_id)):
    try:
        require_matching_user(auth_user_id, user.id)
        user_response = supabase.table("users").insert({
            "id": user.id,
            "display_name": user.display_name,
            "location": user.location,
            "badges": []
        }).execute()
        return {"status": "success", "data": user_response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 