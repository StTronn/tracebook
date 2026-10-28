"""uv run --project evals/adapters/spider2-lite python -m spider2_lite.main [--output-dir D] [--task-ids local329 …]
[--limit N] [--overwrite] [--bundle NAME]. No --task-ids → every eligible task (local, no external_knowledge); fetch.sh
them first. --bundle builds one multi-question task from adapter.BUNDLES instead."""
import argparse
from pathlib import Path

from .adapter import BUNDLES, EVALS, Spider2LiteAdapter, make_bundle


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--output-dir", type=Path, default=EVALS / "datasets" / "data-agent")
    ap.add_argument("--limit", type=int, default=None, help="generate only the first N tasks")
    ap.add_argument("--overwrite", action="store_true", help="overwrite existing task dirs (else skipped)")
    ap.add_argument("--task-ids", nargs="+", default=None)
    ap.add_argument("--bundle", choices=sorted(BUNDLES), help="build one multi-question task (questions on one db)")
    a = ap.parse_args()
    if a.bundle:
        if (a.output_dir / a.bundle).exists() and not a.overwrite:
            print(f"{a.bundle}: exists, skipped (use --overwrite)")
        else:
            print(make_bundle(a.bundle, a.output_dir))
        return
    Spider2LiteAdapter(a.output_dir, limit=a.limit, overwrite=a.overwrite, task_ids=a.task_ids).run()


if __name__ == "__main__":
    main()
