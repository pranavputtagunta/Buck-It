# backend/services/llm_service.py

import os
import json
import google.generativeai as genai
from typing import Type, Any, Optional

class GeminiManager:
    def __init__(self):
        # Configure once when the class is instantiated
        api_key = os.getenv("GEMINI_API_KEY")
        gemini_model = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is missing from environment variables.")
        genai.configure(api_key=api_key)
        
        # Default model for the hackathon (Flash is fast and cheap)
        self.model_name = gemini_model

    def generate_structured_response(
        self, 
        system_instruction: str, 
        user_prompt: str, 
        response_schema: Type[Any], 
        user_context: Optional[dict] = None
    ) -> dict:
        """
        A universal method to call Gemini, inject context, and guarantee JSON output.
        """
        
        # 1. Inject the User Context (if provided)
        # We append the user's database info directly into the system instructions.
        if user_context:
            context_string = json.dumps(user_context, indent=2)
            system_instruction += f"\n\n--- CURRENT USER CONTEXT ---\n{context_string}"

        # 2. Initialize the Model
        model = genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=system_instruction
        )

        # 3. Call the API and force the Pydantic schema
        response = model.generate_content(
            user_prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=response_schema,
                temperature=0.7, 
            )
        )

        # 4. Parse and return the JSON dictionary
        return json.loads(response.text)

# Create a singleton instance to import across your app
llm = GeminiManager()