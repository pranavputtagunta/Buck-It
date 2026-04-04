import httpx

from app.core.config import get_settings
from app.schemas.planning import PlanBucketRequest, PlanBucketResponse


def _mock_plan(payload: PlanBucketRequest) -> PlanBucketResponse:
    return PlanBucketResponse(
        title=f"{payload.activity} in {payload.city}",
        summary="Top-rated option pulled into a shareable bucket card.",
        location_name=f"Best match for {payload.activity}",
        booking_link="https://example.com",
        hours="9:00 AM - 6:00 PM",
        source="mock",
        used_mock=True,
    )


async def plan_bucket(payload: PlanBucketRequest) -> PlanBucketResponse:
    settings = get_settings()
    if not settings.browser_use_api_url:
        return _mock_plan(payload)

    headers = {}
    if settings.browser_use_api_key:
        headers["Authorization"] = f"Bearer {settings.browser_use_api_key}"

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            settings.browser_use_api_url,
            json=payload.model_dump(),
            headers=headers,
        )
        response.raise_for_status()
        data = response.json()

    data.setdefault("source", "browser_use")
    data.setdefault("used_mock", False)
    return PlanBucketResponse.model_validate(data)
