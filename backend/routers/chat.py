from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import supabase
from services.llm_service import llm
from schemas import BucketDisplay

router = APIRouter(prefix="/api/chat", tags=["Chat"])

class MessageCreate(BaseModel):
    chat_id: str      # Changed from bucket_id
    user_id: Optional[str] = None # Added to match schema
    sender_name: str
    text: str


class SharePostAsAiEventRequest(BaseModel):
    chat_id: str
    user_id: str
    sender_name: str
    post_user: Optional[str] = None
    post_caption: Optional[str] = None
    post_location: Optional[str] = None
    post_category: Optional[str] = None
    post_image: Optional[str] = None


def _get_user_location(user_id: str) -> str:
    response = supabase.table("users").select("location").eq("id", user_id).execute()
    if response.data and isinstance(response.data[0], dict):
        return response.data[0].get("location") or "San Diego"
    return "San Diego"

@router.post("/")
async def send_message(msg: MessageCreate):
    try:
        # Note: We removed the human message insert here! 
        # The frontend is already inserting the user's message directly to Supabase.
        # This endpoint is now purely the "AI Agent Brain".

        ai_response_data = None

        # THE AI TRIGGER: Did they ping the bot?
        if "@ai" in msg.text.lower() or "schedule" in msg.text.lower():

            # Current lightweight chat response path for direct @ai scheduling prompts.
            ai_text = f"I noticed you're talking about '{msg.text.replace('@AI', '').strip()}'. I can scan your group's availability and suggest a time! ✨"
            
            # Save the AI's response to the database
            ai_insert = supabase.table("chat_messages").insert({
                "chat_id": msg.chat_id,          # Updated column name
                "user_id": None,                 # AI has no auth user_id
                "sender_name": "Buck-it Agent",
                "text": ai_text,
                "type": "ai"
            }).execute()
            
            # Supabase Python client returns data in a list
            if ai_insert.data:
                ai_response_data = ai_insert.data[0]

        # Return success, and include the AI's reply if it triggered
        return {
            "status": "success", 
            "ai_reply": ai_response_data
        }

    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/share-post-as-ai-event")
async def share_post_as_ai_event(request: SharePostAsAiEventRequest):
    try:
        user_location = _get_user_location(request.user_id)

        system_prompt = (
            "You are the Bucket App assistant. Convert a social post into ONE actionable bucket idea. "
            "Return only one bucket in the required schema. Keep it concise and realistic."
        )

        post_summary = (
            f"Post author: {request.post_user or 'Unknown'}\n"
            f"Caption: {request.post_caption or ''}\n"
            f"Location: {request.post_location or ''}\n"
            f"Category hint: {request.post_category or ''}\n"
            f"Image URL: {request.post_image or ''}\n"
            f"Viewer location: {user_location}"
        )

        ai_bucket = llm.generate_structured_response(
            system_instruction=system_prompt,
            user_prompt=post_summary,
            response_schema=BucketDisplay,
            user_context={"viewer_location": user_location},
        )

        if not isinstance(ai_bucket, dict):
            raise HTTPException(status_code=500, detail="AI did not return a valid bucket")

        title = ai_bucket.get("title") or "AI Bucket Idea"
        category = ai_bucket.get("category") or "General"
        description = ai_bucket.get("description") or "Generated from a shared post."
        location = ai_bucket.get("location") or request.post_location or user_location
        event_time = ai_bucket.get("event_time") or "Flexible timing"

        ai_message = (
            "AI Bucket from shared post\n"
            f"Title: {title}\n"
            f"Category: {category}\n"
            f"Location: {location}\n"
            f"When: {event_time}\n"
            f"Details: {description}"
        )

        insert_response = supabase.table("chat_messages").insert({
            "chat_id": request.chat_id,
            "user_id": None,
            "sender_name": "Buck-it Agent",
            "text": ai_message,
            "type": "ai",
        }).execute()

        return {
            "status": "success",
            "data": {
                "bucket": ai_bucket,
                "message": insert_response.data[0] if insert_response.data else None,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Share Post AI Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))