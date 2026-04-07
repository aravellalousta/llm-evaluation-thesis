"""
Manages conversations with OpenAI's API.
"""

import os
from dotenv import load_dotenv
from openai import OpenAI
from typing import List, Dict


class OpenAIConversationManager:
    """Manages conversation state and API calls with OpenAI."""

    def __init__(self, model: str, system_instruction: str):
        """
        Initialize the OpenAIConversationManager.

        Args:
            model: Model name (e.g., 'gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-preview')
            system_instruction: System instruction for the model
        """
        load_dotenv()
        api_key = os.getenv("OPEN_AI_KEY")
        if not api_key:
            raise RuntimeError("Missing OPEN_AI_KEY. Check your .env file.")

        self.client = OpenAI(api_key=api_key)
        self.model = model
        self.system_instruction = system_instruction
        self.conversation_history: List[Dict[str, str]] = []

    def send_message(self, user_input: str) -> str:
        """
        Send a message to OpenAI and get a response.

        Args:
            user_input: User's message

        Returns:
            Model's response text
        """
        # Add user message to history
        self.conversation_history.append({"role": "user", "content": user_input})

        # Prepare messages for API
        messages = self._prepare_messages()

        # Call the API
        response = self.client.chat.completions.create(
            model=self.model, messages=messages, temperature=0.7, max_tokens=2048
        )

        model_response = response.choices[0].message.content

        # Add model response to history
        self.conversation_history.append(
            {"role": "assistant", "content": model_response}
        )

        return model_response

    def _prepare_messages(self) -> List[Dict[str, str]]:
        """
        Prepare conversation history in OpenAI API format.

        Returns:
            List of message dicts for the API
        """
        messages = [{"role": "system", "content": self.system_instruction}]

        # Add conversation history
        for turn in self.conversation_history:
            messages.append(turn)

        return messages

    def get_conversation_history(self) -> List[Dict[str, str]]:
        """
        Get the full conversation history (excluding system instruction).

        Returns:
            List of conversation turns
        """
        return self.conversation_history
