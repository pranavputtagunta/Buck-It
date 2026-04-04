from pydantic import BaseModel, Field


class BucketListItemSuggestion(BaseModel):
    title: str
    category: str
    deadline: str
    motivation: str


class StarterBucketSuggestion(BaseModel):
    title: str
    description: str
    location_name: str
    scheduled_at: str
    state: str = "planned"
    related_goal_title: str


class OnboardingRequest(BaseModel):
    user_id: str | None = None
    city: str = Field(default="San Diego")
    answer_one: str = Field(min_length=1)
    answer_two: str = Field(min_length=1)


class OnboardingResponse(BaseModel):
    summary: str
    bucket_list_items: list[BucketListItemSuggestion]
    starter_buckets: list[StarterBucketSuggestion]
    suggested_badges: list[str]
    used_mock: bool = False
