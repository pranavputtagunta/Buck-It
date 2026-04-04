from fastapi import APIRouter

from app.api.routes.bucket_list import router as bucket_list_router
from app.api.routes.buckets import router as buckets_router
from app.api.routes.health import router as health_router
from app.api.routes.onboarding import router as onboarding_router
from app.api.routes.planning import router as planning_router


api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(onboarding_router, prefix="/api", tags=["onboarding"])
api_router.include_router(bucket_list_router, prefix="/api", tags=["bucket-list"])
api_router.include_router(buckets_router, prefix="/api", tags=["buckets"])
api_router.include_router(planning_router, prefix="/api", tags=["planning"])
