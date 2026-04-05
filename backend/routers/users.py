from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from database import supabase

# All routes here automatically start with /api/users
router = APIRouter(prefix="/api/users", tags=["Users"])

class BadgeUpdate(BaseModel):
    badges: List[str]
    
class UserCreate(BaseModel):
    id: str
    display_name: str

@router.get("/{user_id}")
async def get_user(user_id: str):
    """Fetches a user's profile and their badges."""
    try:
        response = supabase.table("users").select("*").eq("id", user_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{user_id}/badges")
async def update_user_badges(user_id: str, update: BadgeUpdate):
    """Updates a user's credibility badges."""
    try:
        response = supabase.table("users").update({"badges": update.badges}).eq("id", user_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def add_user_badge(user: UserCreate):
    try:
        user_response = supabase.table("users").insert({
            "id": user.id,
            "display_name": user.display_name,
            "badges": []
        }).execute()
        return {"status": "success", "data": user_response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 