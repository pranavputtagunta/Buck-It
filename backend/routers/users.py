from fastapi import APIRouter, HTTPException
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
async def add_user_badge(user: UserCreate):
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