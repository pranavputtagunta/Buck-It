from fastapi import APIRouter, HTTPException

from routers.concierge import format_bucket_cards, get_user_location, run_browser_use_plan
from database import supabase
from schemas import PlanBucketFromListRequest, SearchQuery
from services.llm_service import llm


router = APIRouter(prefix="/api", tags=["Plan Bucket From List"])


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
        location = get_user_location(request.user_id)
        request_text = _generate_search_text(bucket_title, location)

        raw_scraped_data = await run_browser_use_plan(request_text, location)
        formatted_bucket = format_bucket_cards(raw_scraped_data)

        return {
            "status": "success",
            "message": "Browser Use cloud agent successfully scraped and formatted the event.",
            "data": formatted_bucket,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))