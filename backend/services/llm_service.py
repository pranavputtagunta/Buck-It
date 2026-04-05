# backend/services/llm_service.py

import os
import json
from typing import Type, Any, Optional
from dotenv import load_dotenv
from pathlib import Path
from google import genai
from google.genai import types


load_dotenv(Path(__file__).resolve().parents[1] / ".env")

class GeminiManager:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model_name = os.getenv("GEMINI_MODEL") or os.getenv("GEMINI_MODEL_NAME") or "gemini-1.5-flash"
        self._client = None

    def _ensure_client(self) -> None:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is missing from environment variables.")
        if self._client is None:
            self._client = genai.Client(api_key=self.api_key)

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

        self._ensure_client()

        # 2. Call the API and force the schema-backed JSON output
        response = self._client.models.generate_content(
            model=self.model_name,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=response_schema,
                temperature=0.7,
            ),
        )

        # 3. Parse and return the JSON dictionary
        return json.loads(response.text)

# Create a singleton instance to import across your app
llm = GeminiManager()