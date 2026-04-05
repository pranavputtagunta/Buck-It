import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import get_current_user_id, require_matching_user
from services.llm_service import llm
from schemas import BucketGoal, OnboardRequest

router = APIRouter(prefix="/api/onboard", tags=["AI Onboarding"])

@router.post("/")
async def onboard_user(request: OnboardRequest, auth_user_id: str = Depends(get_current_user_id)):
    try:
        require_matching_user(auth_user_id, request.user_id)
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