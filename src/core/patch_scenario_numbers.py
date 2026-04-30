"""
Patch scenario_number into evaluation JSON files.

Reads all *_llm_judge.json and evaluation_*.json files in
src/ui/evaluations-completed/, looks up the session_id in the conversation
files under src/ui/conversations/, and writes scenario_number back into each
evaluation file if it is missing.
"""

import json
import pathlib

BASE = pathlib.Path(__file__).resolve().parent.parent / "ui"
CONVERSATIONS_DIR = BASE / "conversations"
EVALUATIONS_DIR = BASE / "evaluations-completed"


def build_session_scenario_map() -> dict[str, int]:
    """Map session_id -> scenario_number by reading every conversation file."""
    mapping: dict[str, int] = {}
    for conv_file in CONVERSATIONS_DIR.glob("*.json"):
        try:
            data = json.loads(conv_file.read_text(encoding="utf-8"))
            sid = data.get("session_id")
            scenario = data.get("scenario_number")
            if sid and scenario is not None:
                mapping[sid] = scenario
        except Exception as e:
            print(f"  [WARN] Could not read {conv_file.name}: {e}")
    return mapping


def patch_eval_file(path: pathlib.Path, scenario_map: dict[str, int]) -> None:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"  [WARN] Could not read {path.name}: {e}")
        return

    if "scenario_number" in data:
        print(
            f"  [SKIP] {path.name} — already has scenario_number={data['scenario_number']}"
        )
        return

    sid = data.get("session_id")
    if not sid:
        print(f"  [WARN] {path.name} — no session_id field, skipping")
        return

    scenario = scenario_map.get(sid)
    if scenario is None:
        print(
            f"  [WARN] {path.name} — session_id '{sid}' not found in conversation files"
        )
        return

    data["scenario_number"] = scenario
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  [OK]   {path.name} — patched with scenario_number={scenario}")


def main() -> None:
    print("Building session → scenario map from conversation files...")
    scenario_map = build_session_scenario_map()
    print(f"  Found {len(scenario_map)} conversations.\n")

    eval_files = sorted(
        list(EVALUATIONS_DIR.glob("*_llm_judge.json"))
        + list(EVALUATIONS_DIR.glob("evaluation_*.json"))
    )
    print(f"Patching {len(eval_files)} evaluation files...")
    for f in eval_files:
        patch_eval_file(f, scenario_map)

    print("\nDone.")


if __name__ == "__main__":
    main()
