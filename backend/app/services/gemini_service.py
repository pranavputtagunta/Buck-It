import json
from datetime import date, timedelta

import httpx

from app.core.config import get_settings
from app.schemas.onboarding import OnboardingRequest, OnboardingResponse


def _mock_onboarding_response(payload: OnboardingRequest) -> OnboardingResponse:
    today = date.today()
    return OnboardingResponse(
        summary=f"Starter pack for {payload.city} based on your answers.",
        bucket_list_items=[
            {
                "title": "Get back into taekwondo",
                "category": "Fitness",
                "deadline": str(today + timedelta(days=14)),
                "motivation": "Build consistency with a beginner-friendly class.",
            },
            {
                "title": "Join a weekend outdoor activity",
                "category": "Adventure",
                "deadline": str(today + timedelta(days=10)),
                "motivation": "Make weekends more social and active.",
            },
            {
                "title": "Try one new local skill meetup",
                "category": "Learning",
                "deadline": str(today + timedelta(days=21)),
                "motivation": "Turn curiosity into a concrete plan.",
            },
        ],
        starter_buckets=[
            {
                "title": "Beginner Taekwondo Session",
                "description": "Low-pressure class with intro drills and partner work.",
                "location_name": f"{payload.city} Martial Arts Center",
                "scheduled_at": str(today + timedelta(days=5)),
                "state": "planned",
                "related_goal_title": "Get back into taekwondo",
            },
            {
                "title": "Sunset Coastal Hike",
                "description": "Small group hike with photo stops and an easy route.",
                "location_name": f"{payload.city} Coast Trail",
                "scheduled_at": str(today + timedelta(days=3)),
                "state": "planned",
                "related_goal_title": "Join a weekend outdoor activity",
            },
            {
                "title": "Maker Meetup",
                "description": "Meet people building side projects and learning together.",
                "location_name": f"Downtown {payload.city}",
                "scheduled_at": str(today + timedelta(days=8)),
                "state": "planned",
                "related_goal_title": "Try one new local skill meetup",
            },
        ],
        suggested_badges=["Reliable Planner", "Adventure Starter", "Skill Seeker"],
        used_mock=True,
    )


async def generate_onboarding_response(payload: OnboardingRequest) -> OnboardingResponse:
    settings = get_settings()
    if not settings.gemini_api_key:
        return _mock_onboarding_response(payload)

    prompt = f"""
You are the Bucket onboarding guide.
Return valid JSON only.
Generate exactly 3 bucket_list_items and exactly 3 starter_buckets.

User city: {payload.city}
Answer 1: {payload.answer_one}
Answer 2: {payload.answer_two}

Return this JSON shape:
{{
  "summary": "string",
  "bucket_list_items": [
    {{"title": "string", "category": "string", "deadline": "YYYY-MM-DD", "motivation": "string"}}
  ],
  "starter_buckets": [
    {{"title": "string", "description": "string", "location_name": "string", "scheduled_at": "YYYY-MM-DD", "state": "planned", "related_goal_title": "string"}}
  ],
  "suggested_badges": ["string", "string", "string"]
}}
""".strip()

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"},
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=body)
            response.raise_for_status()
            data = response.json()

        text = data["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(text)
        parsed["used_mock"] = False
        return OnboardingResponse.model_validate(parsed)
    except (httpx.HTTPError, KeyError, IndexError, json.JSONDecodeError, ValueError):
        return _mock_onboarding_response(payload)
