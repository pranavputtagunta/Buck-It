import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from browser_use_sdk.v3 import AsyncBrowserUse

from database import supabase
from services.llm_service import llm


router = APIRouter(prefix="/api", tags=["Plan Bucket From List"])


class PlanBucketFromListRequest(BaseModel):
    user_id: str
    bucket_list_item_id: str
    location: str = "San Diego"


class SearchQuery(BaseModel):
    request_text: str


def _generate_search_text(bucket_title: str, location: str) -> str:
    system_prompt = (
        "You turn a single bucket list goal into one clean local search request for a web agent. "
        "Return valid JSON only with a single field named request_text."
    )
    user_prompt = (
        f"Bucket list item: {bucket_title}\n"
        f"Location: {location}\n"
        "Generate one natural search request that will help a web agent find strong local matches."
    )

    try:
        response = llm.generate_structured_response(
            system_instruction=system_prompt,
            user_prompt=user_prompt,
            response_schema=SearchQuery,
        )
        return response.get("request_text") or f"Find three highly rated options for {bucket_title} in {location}"
    except Exception:
        return f"Find three highly rated options for {bucket_title} in {location}"


@router.post("/plan-bucket-from-list")
async def plan_bucket_from_list(request: PlanBucketFromListRequest):
    try:
        bucket_item_response = (
            supabase.table("bucket_list_items")
            .select("*")
            .eq("id", request.bucket_list_item_id)
            .eq("user_id", request.user_id)
            .execute()
        )

        if not bucket_item_response.data:
            raise HTTPException(status_code=404, detail="Bucket list item not found")

        bucket_item = bucket_item_response.data[0]
        bucket_title = bucket_item.get("title", "activity")
        request_text = _generate_search_text(bucket_title, request.location)

        client = AsyncBrowserUse(os.getenv("BROWSER_USE_API_KEY"))
        agent_task = (
            f"Go to Yelp or Google Maps and search for: {request_text} in {request.location}. "
            "Find three top-rated locations, or if the user provides another criteria, use that."
            "Extract the exact Name, Address, Hours of Operation today, and a URL link to the business. "
            "DO NOT attempt to make a reservation, click 'buy', or enter any personal information. "
            "Return the extracted information as plain text."
        )

        result = await client.run(agent_task)
        raw_scraped_data = result.output

        return {
            "status": "success",
            "message": "Browser Use cloud agent successfully scraped the bucket list item.",
            "data": {
                "request_text": request_text,
                "bucket_list_item_title": bucket_title,
                "browser_use_output": raw_scraped_data,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))