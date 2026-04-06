"""
Simulates tutoring conversations between a Socratic tutor and all student personas.
Saves conversations to JSON files.
"""

import json
import uuid
from pathlib import Path
import sys

# Add core folder to path for imports
sys.path.insert(0, str(Path(__file__).parent / "core"))

from config import (
    MODEL_NAME,
    TUTOR_SYSTEM_PROMPT,
    PERSONA_1_PROMPT,
    PERSONA_2_PROMPT,
    PERSONA_3_PROMPT,
    PERSONA_4_PROMPT,
    SCENARIOS,
)
from conversation_manager import ConversationManager

# Persona name mapping
PERSONA_NAMES = {1: "Disengaged", 2: "Motivated", 3: "Frustrated", 4: "Wrong Answers"}

# Mapping of persona numbers to prompts
PERSONAS = {
    1: {"prompt": PERSONA_1_PROMPT, "name": PERSONA_NAMES[1]},
    2: {"prompt": PERSONA_2_PROMPT, "name": PERSONA_NAMES[2]},
    3: {"prompt": PERSONA_3_PROMPT, "name": PERSONA_NAMES[3]},
    4: {"prompt": PERSONA_4_PROMPT, "name": PERSONA_NAMES[4]},
}


def simulate_tutoring_session(
    persona_num: int, num_turns: int = 8, scenario_num: int = 1
) -> dict:
    """
    Simulate a tutoring conversation between a tutor and a student persona.

    Args:
        persona_num: The persona number (1-4)
        num_turns: Number of conversation turns (default: 8)
        scenario_num: Which scenario opening to use (1-4)

    Returns:
        Dictionary with conversation data
    """
    persona_data = PERSONAS.get(persona_num)
    if not persona_data:
        raise ValueError(f"Invalid persona number: {persona_num}")

    # Initialize the two conversation managers
    tutor = ConversationManager(MODEL_NAME, TUTOR_SYSTEM_PROMPT)
    student = ConversationManager(MODEL_NAME, persona_data["prompt"])

    # Get the opening message from the scenario
    opening_message = SCENARIOS.get(scenario_num, SCENARIOS[1])

    # List to store the full conversation
    conversation = []

    # First message from student (opening)
    conversation.append({"role": "student", "text": opening_message})

    # Run the conversation for the specified number of turns
    for turn in range(num_turns):
        # TUTOR responds to the student
        tutor_response = tutor.send_message(
            opening_message if turn == 0 else student_response
        )
        conversation.append({"role": "tutor", "text": tutor_response})

        # STUDENT responds to the tutor
        student_response = student.send_message(tutor_response)
        conversation.append({"role": "student", "text": student_response})

    return {
        "session_id": str(uuid.uuid4()),
        "persona_number": persona_num,
        "persona_name": persona_data["name"],
        "scenario_number": scenario_num,
        "tutor_system_prompt": TUTOR_SYSTEM_PROMPT,
        "student_system_prompt": persona_data["prompt"],
        "turns": conversation,
    }


def save_conversation_to_json(data: dict, persona_num: int, scenario_num: int) -> Path:
    """
    Save the conversation to a JSON file with proper naming.

    Args:
        data: Conversation data dictionary
        persona_num: The persona number
        scenario_num: The scenario number

    Returns:
        Path to the saved file
    """
    # Create conversations folder if it doesn't exist
    conversations_dir = Path("conversations")
    conversations_dir.mkdir(exist_ok=True)

    # Create filename with convention: conversation_per_[persona]_sc_[scenario].json
    filename = f"conversation_per_{persona_num}_sc_{scenario_num}.json"
    output_path = conversations_dir / filename

    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)

    return output_path


def main():
    """Run all tutoring session simulations for Scenario 1 with all personas."""
    print("Starting tutoring session simulations...")
    print()

    all_conversations = []
    saved_files = []

    # Run simulations for all personas with Scenario 1
    for persona_num in [1, 2, 3, 4]:
        print(f"Running simulation for {PERSONAS[persona_num]['name']}...")

        # Simulate the session
        conversation_data = simulate_tutoring_session(
            persona_num=persona_num, num_turns=8, scenario_num=1
        )

        # Save to JSON
        saved_path = save_conversation_to_json(
            conversation_data, persona_num, scenario_num=1
        )
        print(f"  Saved to {saved_path}")

        all_conversations.append(conversation_data)
        saved_files.append(saved_path)

    print()
    print(f"All {len(all_conversations)} conversations completed!")
    print("Open index.html to view conversations")
    print()


if __name__ == "__main__":
    main()
