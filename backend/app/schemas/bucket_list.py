from pydantic import BaseModel, Field


class BucketListItemBase(BaseModel):
    title: str = Field(min_length=1)
    category: str
    deadline: str
    motivation: str | None = None


class BucketListItemCreate(BucketListItemBase):
    user_id: str | None = None
    source: str = "manual"


class BucketListItemRead(BucketListItemBase):
    id: str
    user_id: str | None = None
    source: str = "manual"
