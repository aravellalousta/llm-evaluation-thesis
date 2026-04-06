"""
Main script for interactive LLM conversation.
"""

import sys
from pathlib import Path

# Add core folder to path for imports
sys.path.insert(0, str(Path(__file__).parent / "core"))

from config import MODEL_NAME, SYSTEM_INSTRUCTION, CONVERSATION_END_SIGNAL
from conversation_manager import ConversationManager
from json_response_create import ConversationSaver, create_turn


def main():
    """Run the interactive conversation with the LLM."""
    print("=" * 60)
    print("LLM Tutoring Session")
    print("=" * 60)
    print(f"Model: {MODEL_NAME}")
    print(f"Type '{CONVERSATION_END_SIGNAL}' to end the conversation\n")

    # Initialize conversation manager
    manager = ConversationManager(MODEL_NAME, SYSTEM_INSTRUCTION)

    # Conversation loop
    while True:
        user_input = input("You: ").strip()

        if user_input.lower() == CONVERSATION_END_SIGNAL:
            print("\nEnding conversation...")
            break

        if not user_input:
            print("Please enter a message.\n")
            continue

        # Get response from model
        print("\nTutor: ", end="", flush=True)
        model_response = manager.send_message(user_input)
        print(model_response)
        print()

    # Save conversation to JSON
    conversation_history = manager.get_conversation_history()

    if conversation_history:
        saver = ConversationSaver()
        filepath = saver.save_conversation(
            turns=conversation_history,
            model=MODEL_NAME,
            system_instruction=SYSTEM_INSTRUCTION,
        )
        print(f"Conversation saved to: {filepath}")
    else:
        print("No conversation to save.")


if __name__ == "__main__":
    main()
