"""
Manages conversations with the LLM.
"""

import os
from dotenv import load_dotenv
from google import genai
from google.genai import types
from typing import List, Dict


class ConversationManager:
    """Manages conversation state and API calls with Google Gemini."""

    def __init__(self, model: str, system_instruction: str):
        """
        Initialize the ConversationManager.

        Args:
            model: Model name (e.g., 'models/gemini-2.5-flash')
            system_instruction: System instruction for the model
        """
        load_dotenv()
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError("Missing GOOGLE_API_KEY. Check your .env file.")

        self.client = genai.Client(api_key=api_key)
        self.model = model
        self.system_instruction = system_instruction
        self.conversation_history: List[Dict[str, str]] = []

    def send_message(self, user_input: str) -> str:
        """
        Send a message to the LLM and get a response.

        Args:
            user_input: User's message

        Returns:
            Model's response text
        """
        # Add user message to history
        self.conversation_history.append({"role": "user", "text": user_input})

        # Prepare contents for API (convert history to Gemini format)
        contents = self._prepare_contents()

        # Call the API
        response = self.client.models.generate_content(
            model=self.model,
            config=types.GenerateContentConfig(
                system_instruction=self.system_instruction
            ),
            contents=contents,
        )

        model_response = response.text

        # Add model response to history
        self.conversation_history.append({"role": "model", "text": model_response})

        return model_response

    def _prepare_contents(self) -> List[types.Content]:
        """
        Prepare conversation history in Gemini API format.

        Returns:
            List of Content objects for the API
        """
        contents = []
        for turn in self.conversation_history:
            if turn["role"] == "user":
                contents.append(
                    types.Content(role="user", parts=[types.Part(text=turn["text"])])
                )
            else:
                contents.append(
                    types.Content(role="model", parts=[types.Part(text=turn["text"])])
                )
        return contents

    def get_conversation_history(self) -> List[Dict[str, str]]:
        """
        Get the full conversation history.

        Returns:
            List of conversation turns
        """
        return self.conversation_history
