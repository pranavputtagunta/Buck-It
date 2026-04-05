from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from database import supabase
from typing import List, Optional, Dict, Any

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
    print("HIT /api/users/ with:", user.model_dump())

    try:
        user_response = supabase.table("users").insert({
            "id": user.id,
            "display_name": user.display_name,
            "badges": []
        }).execute()

        print("SUPABASE INSERT RESPONSE:", user_response.data)

        return {"status": "success", "data": user_response.data}
    except Exception as e:
        print("INSERT FAILED:", str(e))
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
    print(f"📍 Syncing profile and location for user: {profile.id}")

    try:
        # 1. Surgical update for 'public.users'
        # We only include the columns confirmed in your screenshot
        user_table_payload = {
            "id": profile.id,
            "display_name": profile.username,
            "location": profile.location if profile.location else None 
        }

        # This now pushes the location to the database
        supabase.table("users").upsert(user_table_payload).execute()
        print(f"✅ User table updated with location: {profile.location}")

        # 2. Push items to 'bucket_list_items'
        if profile.bucket_list:
            items_to_insert = [
                {
                    "user_id": profile.id,
                    "title": item.title,
                    "deadline": item.deadline if item.deadline and item.deadline.strip() else None,
                } for item in profile.bucket_list
            ]
            
            supabase.table("bucket_list_items").insert(items_to_insert).execute()
            print(f"✅ {len(items_to_insert)} items pushed to bucket_list_items")

        return {"status": "success"}

    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    print(f"🛠️ Using original design for user: {profile.id}")

    try:
        # 1. Update 'users' table - ONLY with the columns that exist there
        # We are explicitly EXCLUDING hobbies, personality, and location
        user_table_payload = {
            "id": profile.id,
            "display_name": profile.username, # Maps 'username' to 'display_name'
        }

        # This call now ONLY touches the 2 columns you have in public.users
        supabase.table("users").upsert(user_table_payload).execute()
        print("✅ public.users updated (id & display_name only)")

        # 2. Route the bucket items to your separate table
        if profile.bucket_list:
            items_to_insert = [
                {
                    "user_id": profile.id,
                    "title": item.title,
                    "deadline": item.deadline if item.deadline and item.deadline.strip() else None,
                } for item in profile.bucket_list
            ]
            
            # This hits the table from your screenshot
            supabase.table("bucket_list_items").insert(items_to_insert).execute()
            print(f"✅ {len(items_to_insert)} items pushed to bucket_list_items")

        return {"status": "success"}

    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))