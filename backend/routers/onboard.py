import os
import json
import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import supabase
from services.llm_service import llm

router = APIRouter(prefix="/api/onboard", tags=["AI Onboarding"])

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")

class BucketGoal(BaseModel):
    title: str
    deadline: str

class OnboardRequest(BaseModel):
    user_id: str
    user_answers: str

@router.post("/")
async def onboard_user(request: OnboardRequest):
    try:
        system_instruction = (
            "You are 'The Hype Guide', an energetic AI onboarding assistant for a social app called Bucket. "
            "Generate EXACTLY 3 actionable bucket list goals based on the user's input. "
            "Assign a realistic deadline for each (formatted strictly as YYYY-MM-DD)."
        )

        ai_response = llm.generate_structured_response(
            system_instruction=system_instruction,
            user_prompt=request.user_answers,
            response_schema=list[BucketGoal]
        )
        
        return {
            "status": "success", 
            "goals": ai_response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))