import os
from fastapi import APIRouter, HTTPException
from browser_use_sdk.v3 import AsyncBrowserUse
from database import supabase
from services.llm_service import llm # Your centralized Gemini class
from schemas import PlanBucketRequest, PlannedBucketCard

router = APIRouter(prefix="/api/concierge", tags=["AI Concierge (Browser Use)"])


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


async def run_browser_use_plan(request_text: str, location: str) -> str:
    client = AsyncBrowserUse(os.getenv("BROWSER_USE_API_KEY"))
    agent_task = (
        f"Find information online about the following: {request_text} in {location}. "
        "Find three top-rated locations, events, activities, etc., or if the user provides another criteria, use that."
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
        response_schema=list[PlannedBucketCard]
    )

@router.post("/plan-bucket")
async def plan_bucket(request: PlanBucketRequest):
    try:
        user_location = get_user_location(request.user_id)

        raw_scraped_data = await run_browser_use_plan(request.request_text, user_location)
        formatted_bucket = format_bucket_cards(raw_scraped_data)
        return {
            "status": "success",
            "message": "Browser Use cloud agent successfully scraped and formatted the event.",
            "data": formatted_bucket
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))