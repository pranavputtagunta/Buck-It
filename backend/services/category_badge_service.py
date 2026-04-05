from collections import Counter
from typing import Optional

from fastapi import HTTPException

from database import supabase


CATEGORY_CONFIG = {
    "Health & Fitness": [
        "running",
        "bouldering",
        "yoga",
        "gym",
        "hiking",
        "surfing",
        "cycling",
        "martial_arts",
    ],
    "Travel & Adventure": [
        "road_trip",
        "camping",
        "backpacking",
        "beach",
        "mountains",
        "international",
        "sightseeing",
    ],
    "Career & Skills": [
        "hackathon",
        "coding",
        "networking",
        "workshop",
        "design",
        "finance",
        "startup",
        "robotics",
    ],
    "Creative & Art": [
        "photography",
        "painting",
        "music",
        "writing",
        "film",
        "dance",
        "cooking",
        "fashion",
    ],
    "Social & Nightlife": [
        "clubbing",
        "bar_hopping",
        "dinner",
        "board_games",
        "karaoke",
        "live_shows",
        "festivals",
    ],
    "Relaxation": [
        "meditation",
        "reading",
        "spa",
        "museum",
        "cafe",
        "picnic",
    ],
}

TAG_TO_CATEGORY = {
    tag.lower(): category
    for category, tags in CATEGORY_CONFIG.items()
    for tag in tags
}

BADGE_TIERS = [
    (1, "Novice"),
    (3, "Explorer"),
    (5, "Master"),
]


def normalize_bucket_category(raw_category: str) -> str:
    value = (raw_category or "").strip()
    if not value:
        raise HTTPException(status_code=400, detail="Bucket category is required")

    for category in CATEGORY_CONFIG:
        if value.lower() == category.lower():
            return category

    mapped = TAG_TO_CATEGORY.get(value.lower())
    if mapped:
        return mapped

    allowed_values = sorted([*CATEGORY_CONFIG.keys(), *TAG_TO_CATEGORY.keys()])
    raise HTTPException(
        status_code=400,
        detail=(
            "Invalid category. Use one of the main categories or known tags. "
            f"Allowed values: {', '.join(allowed_values)}"
        ),
    )


def _badges_for_completed_count(category: str, completed_count: int) -> list[str]:
    earned = []
    for threshold, label in BADGE_TIERS:
        if completed_count >= threshold:
            earned.append(f"{category} {label}")
    return earned


def recalculate_user_badges(user_id: str) -> list[str]:
    buckets_response = (
        supabase.table("buckets")
        .select("category")
        .eq("creator_id", user_id)
        .eq("status", "completed")
        .execute()
    )

    counts: Counter[str] = Counter()
    for row in buckets_response.data or []:
        category = row.get("category") if isinstance(row, dict) else None
        if not isinstance(category, str):
            continue
        try:
            normalized = normalize_bucket_category(category)
        except HTTPException:
            continue
        counts[normalized] += 1

    new_badges: list[str] = []
    for category, completed_count in counts.items():
        new_badges.extend(_badges_for_completed_count(category, completed_count))

    supabase.table("users").update({"badges": new_badges}).eq("id", user_id).execute()
    return new_badges
