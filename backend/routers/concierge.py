import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import get_current_user_id, require_matching_user
from browser_use_sdk.v3 import AsyncBrowserUse
from database import supabase
from services.llm_service import llm # Your centralized Gemini class
from schemas import PlanBucketRequest, PlannedBucketCard, BucketDisplay

router = APIRouter(prefix="/api/concierge", tags=["AI Concierge (Browser Use)"])


<<<<<<< HEAD
def get_user_location(user_id: str) -> str:
    user_response = (
        supabase.table("users")
        .select("location")
        .eq("id", user_id)
        .execute()
    )

    if user_response.data:
        return user_response.data[0].get("location", "San Diego")

    return "San Diego"


=======
>>>>>>> 1efdbf137a53b631dd4f44804adca853a5a61fca
async def run_browser_use_plan(request_text: str, location: str) -> str:
    client = AsyncBrowserUse(os.getenv("BROWSER_USE_API_KEY"))
    agent_task = (
        f"Go to Yelp or Google Maps and search for: {request_text} in {location}. "
        "Find three top-rated locations, or if the user provides another criteria, use that."
        "Extract the exact Name, Address, Hours of Operation today, and a URL link to the business. "
        "DO NOT attempt to make a reservation, click 'buy', or enter any personal information. "
        "Return the extracted information as plain text."
    )

    result = await client.run(agent_task)
    return result.output


def format_bucket_cards(raw_scraped_data: str):
    system_prompt = (
        "You are the Bucket App Hype Guide. You just received raw, scraped data about three local businesses. "
        "Format it perfectly into the requested JSON schema so the frontend can display it as Bucket Cards. "
        "Add a short, energetic 'hype_message' to get the user excited to go."
    )

    return llm.generate_structured_response(
        system_instruction=system_prompt,
        user_prompt=raw_scraped_data,
<<<<<<< HEAD
        response_schema=list[BucketDisplay]
=======
        response_schema=list[PlannedBucketCard]
>>>>>>> 1efdbf137a53b631dd4f44804adca853a5a61fca
    )

@router.post("/plan-bucket")
async def plan_bucket(request: PlanBucketRequest, auth_user_id: str = Depends(get_current_user_id)):
    try:
<<<<<<< HEAD
        require_matching_user(auth_user_id, request.user_id)
        user_location = get_user_location(request.user_id)

        raw_scraped_data = await run_browser_use_plan(request.request_text, user_location)
        formatted_bucket = format_bucket_cards(raw_scraped_data)

=======
        raw_scraped_data = await run_browser_use_plan(request.request_text, request.location)
        formatted_bucket = format_bucket_cards(raw_scraped_data)

>>>>>>> 1efdbf137a53b631dd4f44804adca853a5a61fca
        return {
            "status": "success",
            "message": "Browser Use cloud agent successfully scraped and formatted the event.",
            "data": formatted_bucket
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))