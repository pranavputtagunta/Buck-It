# backend/schemas.py
from typing import List, Optional

from pydantic import BaseModel


class UserCreate(BaseModel):
    id: str
    display_name: str
    location: str = "San Diego"


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    location: Optional[str] = None


class BadgeUpdate(BaseModel):
    badges: List[str]


class BucketListItemCreate(BaseModel):
    user_id: str
    title: str
    deadline: Optional[str] = None


class BucketListItemUpdate(BaseModel):
    title: Optional[str] = None
    deadline: Optional[str] = None


class BucketGoal(BaseModel):
    title: str
    deadline: str


class OnboardRequest(BaseModel):
    user_id: str
    user_answers: str


class BucketCreate(BaseModel):
    creator_id: str
    title: str
    category: str
    event_time: str
    status: str = "planned"
    visibility: str = "private"


class BucketUpdate(BaseModel):
    actor_id: str
    title: Optional[str] = None
    category: Optional[str] = None
    event_time: Optional[str] = None
    status: Optional[str] = None
    visibility: Optional[str] = None


class BucketStatusUpdate(BaseModel):
    actor_id: str
    status: str


class DiscoverFeedItem(BaseModel):
    title: str
    category: str
    short_description: str
    estimated_cost: str
    image_keyword: str


class PlanBucketRequest(BaseModel):
    user_id: str
    request_text: str


class PlannedBucketCard(BaseModel):
    title: str
    location: str
    hours: str
    link: str
    hype_message: str


class PlanBucketFromListRequest(BaseModel):
    user_id: str
    bucket_list_item_id: str


class BucketJoinRequest(BaseModel):
    actor_id: str


class BucketCommentCreate(BaseModel):
    bucket_id: str
    actor_id: str
    content: str


class BucketCommentUpdate(BaseModel):
    actor_id: str
    content: str


class BucketComment(BaseModel):
    id: Optional[str] = None
    bucket_id: str
    user_id: str
    content: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class BucketMediaCreate(BaseModel):
    bucket_id: str
    actor_id: str
    media_type: str
    public_url: str
    storage_path: Optional[str] = None
    caption: Optional[str] = None


class BucketMediaDelete(BaseModel):
    actor_id: str


class BucketMedia(BaseModel):
    id: Optional[str] = None
    bucket_id: str
    user_id: str
    media_type: str
    public_url: str
    storage_path: Optional[str] = None
    caption: Optional[str] = None
    created_at: Optional[str] = None


class SearchQuery(BaseModel):
    request_text: str


class BucketDisplay(BaseModel):
    title: str
    category: str
    description: str
    location: Optional[str] = None
    event_time: Optional[str] = None
    estimated_cost: Optional[str] = None
    link: Optional[str] = None
    image_keyword: Optional[str] = "San Diego"
    id: Optional[str] = None
    creator_id: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[str] = None