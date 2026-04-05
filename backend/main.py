from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import onboard, bucket_list, buckets, users

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

@app.get("/")
def read_root():
    return {"message": "Welcome to the Bucket App Backend!"}