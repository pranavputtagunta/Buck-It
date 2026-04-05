from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import supabase

router = APIRouter(prefix="/api/chat", tags=["Chat"])

class MessageCreate(BaseModel):
    bucket_id: str
    sender_name: str
    text: str

@router.post("/")
async def send_message(msg: MessageCreate):
    try:
        # 1. Save the human's message to Supabase
        supabase.table("chat_messages").insert({
            "bucket_id": msg.bucket_id,
            "sender_name": msg.sender_name,
            "text": msg.text,
            "type": "user"
        }).execute()

        ai_response_data = None

        # 2. THE AI TRIGGER: Did they ping the bot?
        if "@ai" in msg.text.lower():
            # TODO: Plug in OpenAI/Gemini here to generate a real response based on context
            ai_text = f"I noticed you're talking about '{msg.text.replace('@AI', '').strip()}'. I can scan your group's availability and suggest a time! ✨"
            
            # Save the AI's response to the database
            ai_insert = supabase.table("chat_messages").insert({
                "bucket_id": msg.bucket_id,
                "sender_name": "Buck-it Agent",
                "text": ai_text,
                "type": "ai"
            }).execute()
            
            ai_response_data = ai_insert.data[0]

        # Return success, and include the AI's reply if it triggered
        return {
            "status": "success", 
            "ai_reply": ai_response_data
        }

    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))