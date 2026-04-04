from fastapi import APIRouter

from app.schemas.planning import PlanBucketRequest, PlanBucketResponse
from app.services.planning_service import plan_bucket


router = APIRouter()


@router.post("/plan-bucket", response_model=PlanBucketResponse)
async def create_plan(payload: PlanBucketRequest) -> PlanBucketResponse:
    return await plan_bucket(payload)
