from fastapi import FastAPI
from routers import (
    onboard,
    bucket_list,
    buckets,
    users,
    concierge,
    plan_bucket_from_list,
    bucket_invitations,
    bucket_comments,
    bucket_media,
)

app = FastAPI(
    title="Bucket App API",
    description="The backend engine for the future of social media.",
    version="1.0.0"
)

origins = [
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:19006",
    "http://127.0.0.1:19006",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Plug in all your modular routers
app.include_router(onboard.router)
app.include_router(users.router)
app.include_router(bucket_list.router)
app.include_router(buckets.router)
app.include_router(bucket_invitations.router)
app.include_router(bucket_comments.router)
app.include_router(bucket_media.router)
app.include_router(concierge.router)
app.include_router(plan_bucket_from_list.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Bucket App Backend!"}


@app.get("/health")
def health_check():
    return {"status": "ok"}