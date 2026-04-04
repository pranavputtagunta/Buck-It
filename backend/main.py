from fastapi import FastAPI
from database import supabase

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Welcome to the Bucket App Backend!"}

@app.get("/test-db")
def test_db():
    # A quick test to fetch users and verify the backend connection
    response = supabase.table("users").select("*").execute()
    return {"status": "success", "data": response.data}