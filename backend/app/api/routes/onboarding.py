from fastapi import APIRouter

from app.schemas.onboarding import OnboardingRequest, OnboardingResponse
from app.services.gemini_service import generate_onboarding_response
from app.services.supabase_service import save_generated_bucket_list_items


router = APIRouter()


@router.post("/onboard", response_model=OnboardingResponse)
async def onboard(payload: OnboardingRequest) -> OnboardingResponse:
    response = await generate_onboarding_response(payload)
    if payload.user_id:
        await save_generated_bucket_list_items(payload.user_id, response.bucket_list_items)
    return response
