from pydantic import BaseModel, Field


class PlanBucketRequest(BaseModel):
    activity: str = Field(min_length=1)
    city: str = Field(default="San Diego")
    preferences: str | None = None


class PlanBucketResponse(BaseModel):
    title: str
    summary: str
    location_name: str
    booking_link: str
    hours: str
    source: str
    used_mock: bool = False
