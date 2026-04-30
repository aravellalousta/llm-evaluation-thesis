"""
Compute inter-rater agreement (Layer 4) between human evaluators and the
LLM judge across the 8 conversations that received both evaluations.

Outputs:
  - A formatted table to stdout
  - src/ui/evaluations-completed/agreement_stats.json  (consumed by the UI)

Requires: scikit-learn  (pip install scikit-learn)
"""

import json
import pathlib
from sklearn.metrics import cohen_kappa_score

BASE = pathlib.Path(__file__).resolve().parent.parent / "ui" / "evaluations-completed"

HUMAN_SESSIONS = [
    "3bf619d9",
    "41cfbe12",
    "81b38938",
    "a3e2d814",
    "b7fd9029",
    "b84a13c2",
    "e034ff87",
    "e7a250b0",
]

DIMENSIONS = ["H1a", "H1b", "H2", "H3a", "H3b"]
DIMENSION_LABELS = {
    "H1a": "Socratic Restraint",
    "H1b": "Pedagogical Adaptability",
    "H2": "Technical Accuracy",
    "H3a": "Psychological Safety",
    "H3b": "Pedagogical Safety",
}


def kappa_label(k: float) -> str:
    if k < 0.40:
        return "Poor"
    if k < 0.60:
        return "Moderate"
    if k < 0.80:
        return "Substantial"
    return "Almost Perfect"


def load_turn_scores(path: pathlib.Path) -> dict[str, dict[str, int]]:
    """Return {turn_index: {dim: score}} from an evaluation JSON file."""
    data = json.loads(path.read_text(encoding="utf-8"))
    return {
        idx: {dim: int(scores[dim]) for dim in DIMENSIONS if dim in scores}
        for idx, scores in data.get("turn_evaluations", {}).items()
    }


def main() -> None:
    # Collect paired scores per dimension
    paired: dict[str, tuple[list[int], list[int]]] = {d: ([], []) for d in DIMENSIONS}

    for sid in HUMAN_SESSIONS:
        human_path = BASE / f"evaluation_{sid}.json"
        judge_path = BASE / f"{sid}_llm_judge.json"

        if not human_path.exists():
            print(f"[WARN] Missing human eval: {human_path.name}")
            continue
        if not judge_path.exists():
            print(f"[WARN] Missing LLM judge eval: {judge_path.name}")
            continue

        human_turns = load_turn_scores(human_path)
        judge_turns = load_turn_scores(judge_path)

        for turn_idx in human_turns:
            if turn_idx not in judge_turns:
                continue
            for dim in DIMENSIONS:
                h = human_turns[turn_idx].get(dim)
                l = judge_turns[turn_idx].get(dim)
                if h is not None and l is not None:
                    paired[dim][0].append(h)
                    paired[dim][1].append(l)

    # Compute stats and build results dict
    results: dict[str, dict] = {}
    for dim in DIMENSIONS:
        human_scores, judge_scores = paired[dim]
        n = len(human_scores)

        if n == 0:
            kappa = None
            agreement = None
        else:
            kappa = round(
                float(
                    cohen_kappa_score(human_scores, judge_scores, weights="quadratic")
                ),
                3,
            )
            agreement = round(
                sum(h == l for h, l in zip(human_scores, judge_scores)) / n * 100, 1
            )

        if n == 0:
            breakdown = {"exact": 0.0, "off_by_1": 0.0, "off_by_2_plus": 0.0}
        else:
            diffs = [abs(h - l) for h, l in zip(human_scores, judge_scores)]
            exact = sum(d == 0 for d in diffs)
            off_by_1 = sum(d == 1 for d in diffs)
            off_by_2p = sum(d >= 2 for d in diffs)
            breakdown = {
                "exact": round(exact / n * 100, 1),
                "off_by_1": round(off_by_1 / n * 100, 1),
                "off_by_2_plus": round(off_by_2p / n * 100, 1),
            }

        results[dim] = {
            "label": DIMENSION_LABELS[dim],
            "n": n,
            "kappa": kappa,
            "agreement": agreement,
            "interpretation": kappa_label(kappa) if kappa is not None else "N/A",
            "agreement_breakdown": breakdown,
        }

    out_path = BASE / "agreement_stats.json"
    out_path.write_text(
        json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"Saved → {out_path}")


if __name__ == "__main__":
    main()
