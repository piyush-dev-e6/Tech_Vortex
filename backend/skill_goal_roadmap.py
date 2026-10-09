"""Build a deterministic dependency-ordered plan from student-selected skill goals."""

import argparse
import json
import sys
from typing import Any, Dict


def generate_goal_roadmap(profile: Dict[str, Any]) -> Dict[str, Any]:
    """Backward-compatible endpoint adapter for the unified roadmap engine."""
    from roadmap_engine import generate_personalized_roadmap
    return generate_personalized_roadmap(profile)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True)
    args = parser.parse_args()
    try:
        with open(args.input, "r", encoding="utf-8") as source:
            result = generate_goal_roadmap(json.load(source))
        print(json.dumps(result, ensure_ascii=False))
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(2)
