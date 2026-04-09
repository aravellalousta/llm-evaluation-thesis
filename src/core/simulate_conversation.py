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
    GEMINI_MODEL_NAME,
    OPENAI_MODEL_NAME,
    TUTOR_SYSTEM_PROMPT,
    PERSONA_1_PROMPT,
    PERSONA_2_PROMPT,
    PERSONA_3_PROMPT,
    PERSONA_4_PROMPT,
    SCENARIOS,
)
from gemini_conversation_manager import GeminiConversationManager
from openai_conversation_manager import OpenAIConversationManager

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
    persona_num: int,
    num_turns: int = 8,
    scenario_num: int = 1,
    model_type: str = "gemini",  # Specify model type: 'gemini' or 'openai' (default: 'gemini')
) -> dict:
    """
    Simulate a tutoring conversation between a tutor and a student persona.

    Args:
        persona_num: The persona number (1-4)
        num_turns: Number of conversation turns (default: 8)
        scenario_num: Which scenario opening to use (1-4)
        model_type: Which model to use - 'gemini' or 'openai' (default: 'gemini')

    Returns:
        Dictionary with conversation data
    """
    persona_data = PERSONAS.get(persona_num)
    if not persona_data:
        raise ValueError(f"Invalid persona number: {persona_num}")

    if model_type not in ["gemini", "openai"]:
        raise ValueError(
            f"Invalid model_type: {model_type}. Must be 'gemini' or 'openai'"
        )

    # Initialize the conversation managers based on model type
    if model_type == "gemini":
        tutor = GeminiConversationManager(GEMINI_MODEL_NAME, TUTOR_SYSTEM_PROMPT)
        student = GeminiConversationManager(GEMINI_MODEL_NAME, persona_data["prompt"])
        model_used = f"{GEMINI_MODEL_NAME}"
    else:  # openai
        tutor = OpenAIConversationManager(OPENAI_MODEL_NAME, TUTOR_SYSTEM_PROMPT)
        student = OpenAIConversationManager(OPENAI_MODEL_NAME, persona_data["prompt"])
        model_used = f"{OPENAI_MODEL_NAME}"

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
        "session_id": str(uuid.uuid4())[:8],
        "persona_number": persona_num,
        "persona_name": persona_data["name"],
        "scenario_number": scenario_num,
        "model_used": model_used,
        "tutor_system_prompt": TUTOR_SYSTEM_PROMPT,
        "student_system_prompt": persona_data["prompt"],
        "turns": conversation,
    }


def save_conversation_to_json(
    data: dict, persona_num: int, scenario_num: int, model_used: str = None
) -> Path:
    """
    Save the conversation to a JSON file with proper naming.

    Args:
        data: Conversation data dictionary
        persona_num: The persona number
        scenario_num: The scenario number
        model_used: The model used for the conversation

    Returns:
        Path to the saved file
    """
    # Create conversations folder in the UI directory using absolute path
    ui_dir = Path(__file__).parent.parent / "ui"
    conversations_dir = ui_dir / "conversations"
    conversations_dir.mkdir(parents=True, exist_ok=True)

    # Create filename with convention: conversation_per_[persona]_sc_[scenario].json
    # (model info is already stored in the JSON data)
    filename = f"conversation_per_{persona_num}_sc_{scenario_num}_{model_used}.json"
    output_path = conversations_dir / filename

    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)

    return output_path


def main():
    """
    Run tutoring session simulations.

    Usage:
        python simulate_conversation.py              # Run all personas with Gemini
        python simulate_conversation.py gemini       # Run all personas with Gemini
        python simulate_conversation.py openai       # Run all personas with OpenAI
        python simulate_conversation.py both         # Run all personas with both models
    """
    # Determine which model(s) to use
    model_to_use = "gemini"  # Default

    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()
        if arg in ["gemini", "openai", "both"]:
            model_to_use = arg
        else:
            print(f"Invalid argument: {arg}")
            print("Usage: python simulate_conversation.py [gemini|openai|both]")
            sys.exit(1)

    # Determine which models to run
    models_to_run = []
    if model_to_use == "both":
        models_to_run = ["gemini", "openai"]
    else:
        models_to_run = [model_to_use]

    print("Starting tutoring session simulations...")
    print(f"Models to use: {', '.join(models_to_run)}")
    print()

    all_conversations = []
    saved_files = []

    # Run simulations for all models and personas
    for model_name in models_to_run:
        print(f"\n{'='*60}")
        print(f"Generating conversations with {model_name.upper()}")
        print(f"{'='*60}")

        for persona_num in [1, 2, 3, 4]:
            print(
                f"Running simulation for {PERSONAS[persona_num]['name']} (Scenario 4)"
            )

            try:
                # Simulate the session with the specified model
                conversation_data = simulate_tutoring_session(
                    persona_num=persona_num,
                    num_turns=8,
                    scenario_num=4,
                    model_type=model_name,
                )

                # Save to JSON
                saved_path = save_conversation_to_json(
                    conversation_data,
                    persona_num,
                    scenario_num=4,
                    model_used=model_name,
                )
                print(f"  ✓ Saved to {saved_path}")

                all_conversations.append(conversation_data)
                saved_files.append(saved_path)

            except Exception as e:
                print(f"  ✗ Error: {str(e)}")
                continue

    print()
    print(f"{'='*60}")
    print(f"All simulations completed!")
    print(f"Total conversations generated: {len(all_conversations)}")
    print(f"Total files saved: {len(saved_files)}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
