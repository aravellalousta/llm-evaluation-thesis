from pathlib import Path

MODEL_NAME = "models/gemini-2.5-flash"


def load_system_instruction(prompt_name: str) -> str:
    """
    Load a system instruction from the prompts folder.

    Args:
        prompt_name: Name of the prompt file

    Returns:
        The system instruction text
    """
    prompts_dir = Path(__file__).parent.parent.parent / "prompts"
    prompt_file = prompts_dir / prompt_name

    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt file not found: {prompt_file}")

    return prompt_file.read_text().strip()


# Load system prompts
TUTOR_SYSTEM_PROMPT = load_system_instruction("tutor_system_prompt.md")
PERSONA_1_PROMPT = load_system_instruction("persona_1_system_prompt.md")
PERSONA_2_PROMPT = load_system_instruction("persona_2_system_prompt.md")
PERSONA_3_PROMPT = load_system_instruction("persona_3_system_prompt.md")
PERSONA_4_PROMPT = load_system_instruction("persona_4_system_prompt.md")

# Conversation Opening Messages
SCENARIO_1_OPENING = load_system_instruction("scenario_1_opening.md")
SCENARIO_2_OPENING = load_system_instruction("scenario_2_opening.md")
SCENARIO_3_OPENING = load_system_instruction("scenario_3_opening.md")
SCENARIO_4_OPENING = load_system_instruction("scenario_4_opening.md")


SCENARIOS = {
    1: SCENARIO_1_OPENING,
    2: SCENARIO_2_OPENING,
    3: SCENARIO_3_OPENING,
    4: SCENARIO_4_OPENING,
}

PERSONAS = {
    1: PERSONA_1_PROMPT,
    2: PERSONA_2_PROMPT,
    3: PERSONA_3_PROMPT,
    4: PERSONA_4_PROMPT,
}

# Default system instruction (tutor)
SYSTEM_INSTRUCTION = TUTOR_SYSTEM_PROMPT

# Conversation Configuration
CONVERSATION_END_SIGNAL = "end convo"
