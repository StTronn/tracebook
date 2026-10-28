"""uv run --project evals/adapters/spider2-lite python -m spider2_lite.main [--output-dir D] [--task-ids local329 …]
[--limit N] [--overwrite]. No --task-ids → every eligible task (local, no external_knowledge); fetch.sh them first."""
import argparse
from pathlib import Path

from .adapter import EVALS, Spider2LiteAdapter


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--output-dir", type=Path, default=EVALS / "tasks" / "spider2-lite")
    ap.add_argument("--limit", type=int, default=None, help="generate only the first N tasks")
    ap.add_argument("--overwrite", action="store_true", help="overwrite existing task dirs (else skipped)")
    ap.add_argument("--task-ids", nargs="+", default=None)
    a = ap.parse_args()
    Spider2LiteAdapter(a.output_dir, limit=a.limit, overwrite=a.overwrite, task_ids=a.task_ids).run()


if __name__ == "__main__":
    main()
