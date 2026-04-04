from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class BucketState(str, Enum):
    planned = "planned"
    active = "active"
    completed = "completed"


class BucketBase(BaseModel):
    title: str = Field(min_length=1)
    description: str | None = None
    location_name: str | None = None
    scheduled_at: datetime | None = None
    state: BucketState = BucketState.planned


class BucketCreate(BucketBase):
    user_id: str | None = None
    bucket_list_item_id: str | None = None


class BucketRead(BucketBase):
    id: str
    user_id: str | None = None
    bucket_list_item_id: str | None = None
