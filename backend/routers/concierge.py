import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from browser_use_sdk.v3 import AsyncBrowserUse
from services.llm_service import llm # Your centralized Gemini class

router = APIRouter(prefix="/api/concierge", tags=["AI Concierge (Browser Use)"])

# 1. What the frontend sends us
class PlanBucketRequest(BaseModel):
    user_id: str
    request_text: str # e.g., "Find a highly rated wing spot"
    location: str # e.g., "San Diego"

# 2. What we return to the frontend to render the card
class PlannedBucketCard(BaseModel):
    title: str
    location: str
    hours: str
    link: str
    hype_message: str

@router.post("/plan-bucket")
async def plan_bucket(request: PlanBucketRequest):
    try:
        # 1. Initialize the Browser Use Cloud Client
        # It automatically picks up the BROWSER_USE_API_KEY from your .env file
        client = AsyncBrowserUse(os.getenv("BROWSER_USE_API_KEY"))

        # 2. Craft the strict instruction for the Cloud Agent
        # The Hack: We explicitly tell it NOT to buy anything, just scrape.
        agent_task = (
            f"Go to Yelp or Google Maps and search for: {request.request_text} in {request.location}. "
            "Find three top-rated locations, or if the user provides another criteria, use that."
            "Extract the exact Name, Address, Hours of Operation today, and a URL link to the business. "
            "DO NOT attempt to make a reservation, click 'buy', or enter any personal information. "
            "Return the extracted information as plain text."
        )

        print("☁️ [2] Sending task to Browser Use Cloud... (This will take 15-45 seconds)")
        # 3. Fire off the cloud task (No local Playwright needed!)
        result = await client.run(agent_task)
        raw_scraped_data = result.output

        print("☁️ [3] Raw scraped data received from Browser Use")

        # 4. Pass the raw scraped text to our trusted GeminiManager to format it perfectly
        system_prompt = (
            "You are the Bucket App Hype Guide. You just received raw, scraped data about three local businesses. "
            "Format it perfectly into the requested JSON schema so the frontend can display it as Bucket Cards. "
            "Add a short, energetic 'hype_message' to get the user excited to go."
        )

        formatted_bucket = llm.generate_structured_response(
            system_instruction=system_prompt,
            user_prompt=raw_scraped_data,
            response_schema=list[PlannedBucketCard]
        )

        # 5. Return the perfect JSON to the frontend
        return {
            "status": "success",
            "message": "Browser Use cloud agent successfully scraped and formatted the event.",
            "data": formatted_bucket
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))