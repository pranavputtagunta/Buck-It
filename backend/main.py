import os
import json
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv

# If you have your supabase client in database.py, import it:
# from database import supabase

load_dotenv()

# Initialize FastAPI
app = FastAPI()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# ---------------------------------------------------------
# 1. Define the Data Models (Pydantic)
# ---------------------------------------------------------

# This defines the exact JSON structure we want Gemini to return
class BucketGoal(BaseModel):
    title: str
    deadline: str

# This defines what the React Native frontend will send to this endpoint
class OnboardRequest(BaseModel):
    user_id: str
    user_answers: str

# ---------------------------------------------------------
# 2. The Onboard Endpoint
# ---------------------------------------------------------

@app.post("/api/onboard")
async def onboard_user(request: OnboardRequest):
    try:
        # Define the AI Persona and Rules
        system_instruction = (
            "You are 'The Hype Guide', an energetic, enthusiastic AI onboarding assistant "
            "for a social app called Bucket. The user will give you a brief description "
            "of their interests and what they want to do. "
            "Generate EXACTLY 3 actionable, real-world bucket list goals based on their input. "
            "Assign a realistic deadline for each (formatted strictly as YYYY-MM-DD). "
            "Keep the titles punchy and exciting!"
        )

        # Initialize the model (Flash is perfect for fast, cheap hackathon responses)
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=system_instruction
        )

        # Call Gemini and force it to return a JSON array matching our BucketGoal model
        response = model.generate_content(
            request.user_answers,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=list[BucketGoal],
                temperature=0.7, # Slightly creative but still structured
            )
        )

        # Parse the JSON string returned by Gemini into a Python list of dictionaries
        generated_goals = json.loads(response.text)

        # --- OPTIONAL: Save directly to Supabase ---
        # for goal in generated_goals:
        #     supabase.table("bucket_list_items").insert({
        #         "user_id": request.user_id,
        #         "title": goal["title"],
        #         "deadline": goal["deadline"]
        #     }).execute()

        return {
            "status": "success", 
            "message": "Starter Pack generated successfully!",
            "goals": generated_goals
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))