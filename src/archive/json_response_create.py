"""
JSON response creation and file management for saved conversations.
"""

import json
import uuid
from pathlib import Path
from typing import List, Dict, Any


class ConversationSaver:
    """Handles saving conversations to JSON files."""

    def __init__(self, output_dir: str = "conversations"):
        """
        Initialize the ConversationSaver.

        Args:
            output_dir: Directory to save conversation JSON files
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)

    def save_conversation(
        self,
        turns: List[Dict[str, str]],
        model: str,
        system_instruction: str,
        filename: str = None,
    ) -> str:
        """
        Save a conversation to a JSON file.

        Args:
            turns: List of conversation turns with 'role' and 'text' keys
            model: Model name used in the conversation
            system_instruction: System instruction used for the model
            filename: Optional custom filename (without .json extension)

        Returns:
            Path to the created JSON file
        """
        conversation = {
            "session_id": str(uuid.uuid4()),
            "model": model,
            "system_instruction": system_instruction,
            "turns": turns,
        }

        if filename is None:
            filename = f"conversation_{uuid.uuid4().hex[:8]}"

        filepath = self.output_dir / f"{filename}.json"

        with open(filepath, "w") as f:
            json.dump(conversation, f, indent=2)

        return str(filepath)


def create_turn(role: str, text: str) -> Dict[str, str]:
    """
    Create a conversation turn object.

    Args:
        role: Either 'user' or 'model'
        text: The message text

    Returns:
        Dictionary with role and text
    """
    return {"role": role, "text": text}
