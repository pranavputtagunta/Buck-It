from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import supabase

router = APIRouter(prefix="/api/chat", tags=["Chat"])

class MessageCreate(BaseModel):
    chat_id: str      # Changed from bucket_id
    user_id: Optional[str] = None # Added to match schema
    sender_name: str
    text: str

@router.post("/")
async def send_message(msg: MessageCreate):
    try:
        # Note: We removed the human message insert here! 
        # The frontend is already inserting the user's message directly to Supabase.
        # This endpoint is now purely the "AI Agent Brain".

        ai_response_data = None

        # THE AI TRIGGER: Did they ping the bot?
        if "@ai" in msg.text.lower() or "schedule" in msg.text.lower():
            
            # TODO: Plug in OpenAI/Gemini here to generate a real response based on context
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