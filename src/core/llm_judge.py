"""
LLM-as-a-Judge evaluation script using Claude Sonnet 4.6.

Reads all conversations from src/ui/conversations/, evaluates each one
against the predefined rubric using the judge system prompt, and saves
results to src/ui/evaluations-completed/ as {session_id}_llm_judge.json.

Already-evaluated conversations are skipped automatically.
"""

import os
import json
import time
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
import anthropic

BASE_DIR = Path(__file__).resolve().parent.parent.parent
CONVERSATIONS_DIR = BASE_DIR / "src" / "ui" / "conversations"
EVALUATIONS_DIR = BASE_DIR / "src" / "ui" / "evaluations-completed"
PROMPTS_DIR = BASE_DIR / "prompts"

MODEL = "claude-sonnet-4-5"
MAX_TOKENS = 1024

SCENARIO_DESCRIPTIONS = {
    1: "Scenario 1 (Introductory): strings, integers, basic operations",
    2: "Scenario 2 (Easy): if-else statements, booleans",
    3: "Scenario 3 (Intermediate): for loops, list manipulation",
    4: "Scenario 4 (Advanced): functions, variable scope",
}


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8").strip()


def load_judge_system_prompt() -> str:
    return _read(PROMPTS_DIR / "llm-judge-system-prompt.md")


def load_tutor_system_prompt() -> str:
    return _read(PROMPTS_DIR / "tutor_system_prompt.md")


def load_persona_prompt(persona_number: int) -> str:
    return _read(PROMPTS_DIR / f"persona_{persona_number}_system_prompt.md")


def already_evaluated(session_id: str) -> bool:
    return (EVALUATIONS_DIR / f"{session_id}_llm_judge.json").exists()


def build_user_message(conv: dict, tutor_prompt: str) -> str:
    """
    Compose the evaluation prompt sent to the judge.

    Sections included (matching the judge system prompt's expected format):
      SCENARIO / PERSONA / TUTOR SYSTEM PROMPT / CONVERSATION
    """
    persona_num = conv["persona_number"]
    scenario_num = conv["scenario_number"]
    persona_desc = load_persona_prompt(persona_num)

    parts = [
        "SCENARIO",
        SCENARIO_DESCRIPTIONS[scenario_num],
        "",
        "PERSONA",
        f"Persona {persona_num} — {conv.get('persona_name', '')}",
        persona_desc,
        "",
        "TUTOR SYSTEM PROMPT",
        tutor_prompt,
        "",
        "CONVERSATION",
    ]

    # Pair consecutive student + tutor messages into numbered turns (max 8).
    MAX_TURNS = 8
    turn_index = 0
    messages = conv.get("turns", [])
    i = 0
    while i < len(messages) and turn_index < MAX_TURNS:
        student_text = ""
        tutor_text = ""

        if i < len(messages) and messages[i]["role"] == "student":
            student_text = messages[i]["text"]
            i += 1
        if i < len(messages) and messages[i]["role"] == "tutor":
            tutor_text = messages[i]["text"]
            i += 1

        parts.append(f"\nTurn {turn_index}")
        parts.append(f"Student: {student_text}")
        parts.append(f"Tutor: {tutor_text}")
        turn_index += 1

    return "\n".join(parts)


def evaluate_conversation(
    client: anthropic.Anthropic,
    conv: dict,
    judge_system_prompt: str,
    tutor_prompt: str,
) -> dict:
    """Call the Claude judge and return the parsed evaluation dict."""
    user_message = build_user_message(conv, tutor_prompt)

    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=judge_system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )

    raw_text = response.content[0].text.strip()

    # Strip markdown code fences if the model wraps the JSON despite instructions.
    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[-1]  # drop opening fence line
        raw_text = raw_text.rsplit("```", 1)[0].strip()  # drop closing fence

    try:
        result = json.loads(raw_text)
    except json.JSONDecodeError:
        # Surface the raw response to help diagnose prompt/model issues.
        raise ValueError(f"Judge returned non-JSON output:\n{raw_text[:500]}")

    result["session_id"] = conv["session_id"]
    result["timestamp"] = (
        datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.")
        + f"{datetime.now(timezone.utc).microsecond // 1000:03d}Z"
    )
    result["model_used"] = MODEL
    return result


def save_result(result: dict, session_id: str) -> Path:
    EVALUATIONS_DIR.mkdir(parents=True, exist_ok=True)
    output_path = EVALUATIONS_DIR / f"{session_id}_llm_judge.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    return output_path


def test_single_conversation(
    filename: str = "conversation_per_1_sc_1_openai.json",
) -> None:
    """Evaluate a single conversation and print the result. Does not save to disk."""
    load_dotenv()
    api_key = os.getenv("CLAUDE_KEY")
    if not api_key:
        raise RuntimeError(
            "CLAUDE_KEY not found. Add it to your .env file:\n"
            "  CLAUDE_KEY=sk-ant-..."
        )

    client = anthropic.Anthropic(api_key=api_key)
    judge_system_prompt = load_judge_system_prompt()
    tutor_prompt = load_tutor_system_prompt()

    conv_path = CONVERSATIONS_DIR / filename
    with open(conv_path, encoding="utf-8") as f:
        conv = json.load(f)

    print(f"Testing: {filename}")
    print(
        f"  persona={conv['persona_number']}  scenario={conv['scenario_number']}  session={conv['session_id']}\n"
    )

    result = evaluate_conversation(client, conv, judge_system_prompt, tutor_prompt)

    print("── Raw result ──────────────────────────────────────────")
    print(json.dumps(result, indent=2))


def main() -> None:
    load_dotenv()
    api_key = os.getenv("CLAUDE_KEY")
    if not api_key:
        raise RuntimeError(
            "CLAUDE_KEY not found. Add it to your .env file:\n"
            "  CLAUDE_KEY=sk-ant-..."
        )

    client = anthropic.Anthropic(api_key=api_key)
    judge_system_prompt = load_judge_system_prompt()
    tutor_prompt = load_tutor_system_prompt()

    conversation_files = sorted(CONVERSATIONS_DIR.glob("conversation_*.json"))
    total = len(conversation_files)
    print(
        f"Found {total} conversation(s) in {CONVERSATIONS_DIR.relative_to(BASE_DIR)}\n"
    )

    evaluated = 0
    skipped = 0
    errors = 0

    for idx, conv_path in enumerate(conversation_files, start=1):
        with open(conv_path, encoding="utf-8") as f:
            conv = json.load(f)

        session_id = conv["session_id"]
        model_tag = conv_path.stem.rsplit("_", 1)[-1]  # "openai" or "gemini"
        label = (
            f"[{idx:02d}/{total}] "
            f"persona={conv['persona_number']} "
            f"scenario={conv['scenario_number']} "
            f"model={model_tag} "
            f"(session {session_id})"
        )

        if already_evaluated(session_id):
            print(f"  SKIP  {label}")
            skipped += 1
            continue

        print(f"  EVAL  {label} … ", end="", flush=True)
        try:
            result = evaluate_conversation(
                client, conv, judge_system_prompt, tutor_prompt
            )
            out_path = save_result(result, session_id)
            turn_count = len(result.get("turn_evaluations", {}))
            print(f"OK  ({turn_count} turns → {out_path.name})")
            evaluated += 1
        except Exception as exc:
            print(f"ERROR\n        {exc}")
            errors += 1

        # Brief pause between calls to stay within rate limits.
        time.sleep(1)

    print(f"\nFinished. Evaluated: {evaluated} | Skipped: {skipped} | Errors: {errors}")


if __name__ == "__main__":
    # ── TEST MODE ─────────────────────────────────────────────────────────────
    # Change the filename below to test any conversation.
    # test_single_conversation("conversation_per_1_sc_1_openai.json")

    # ── FULL RUN (all conversations) ──────────────────────────────────────────
    # Uncomment the line below and comment out test_single_conversation() above
    # when ready to evaluate everything.
   # main()
