"""
Convert string scores in human evaluation JSON files to integers.

Reads every evaluation_*.json in src/ui/evaluations-completed/ and
converts any string values in turn_evaluations (H1a, H1b, H2, H3a, H3b)
to integers in-place.
"""

import json
import pathlib

EVALUATIONS_DIR = (
    pathlib.Path(__file__).resolve().parent.parent / "ui" / "evaluations-completed"
)
DIMENSIONS = {"H1a", "H1b", "H2", "H3a", "H3b"}


def patch(path: pathlib.Path) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    changed = False

    for turn_data in data.get("turn_evaluations", {}).values():
        for dim in DIMENSIONS:
            val = turn_data.get(dim)
            if isinstance(val, str):
                turn_data[dim] = int(val)
                changed = True

    if changed:
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"  [OK]   {path.name} — scores converted to integers")
    else:
        print(f"  [SKIP] {path.name} — already numeric")


def main() -> None:
    eval_files = sorted(EVALUATIONS_DIR.glob("evaluation_*.json"))
    print(f"Patching {len(eval_files)} human evaluation files...\n")
    for f in eval_files:
        patch(f)
    print("\nDone.")


if __name__ == "__main__":
    main()
