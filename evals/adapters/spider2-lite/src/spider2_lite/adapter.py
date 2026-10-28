"""Spider2-lite (local SQLite tasks) → Harbor task directories. CLI: main.py.

Reads the pinned Spider2 files from evals/.cache/spider2/ (see fetch.sh): spider2-lite.jsonl (questions),
spider2lite_eval.jsonl (ignore_order / condition_cols), gold/<id>[_x].csv, localdb/<db>.sqlite. Only `local*` ids
(SQLite) without external_knowledge are supported; BigQuery/Snowflake tasks are refused.
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path
from string import Template

from . import compare  # gold resolution must match the grader exactly

HERE = Path(__file__).resolve().parent
TEMPLATE = HERE / "task-template"
EVALS = HERE.parents[3]
CACHE = EVALS / ".cache" / "spider2"


def _jsonl(path: Path) -> dict[str, dict]:
    return {r["instance_id"]: r for r in (json.loads(l) for l in path.read_text().splitlines() if l.strip())}


def make_task(iid: str, out: Path, cache: Path = CACHE) -> Path:
    if not iid.startswith("local"):
        raise SystemExit(f"{iid}: only local SQLite tasks are supported (got a cloud-warehouse task)")
    tasks, standards = _jsonl(cache / "spider2-lite.jsonl"), _jsonl(cache / "spider2lite_eval.jsonl")
    if iid not in tasks:
        raise SystemExit(f"{iid}: not in spider2-lite.jsonl")
    t, std = tasks[iid], {k: v for k, v in standards.get(iid, {}).items() if k in ("condition_cols", "ignore_order")}
    if t.get("external_knowledge"):
        raise SystemExit(f"{iid}: external_knowledge documents are not supported yet")
    db = cache / "localdb" / f"{t['db']}.sqlite"
    golds, _ = compare.gold_paths(cache / "gold", iid)
    if not db.exists() or not golds:
        raise SystemExit(f"{iid}: missing {db if not db.exists() else 'gold csv'} — run fetch.sh first")
    vals = {"instance_id": iid, "db": t["db"], "question": t["question"].strip(),
            "commit": (cache / "COMMIT").read_text().strip(),
            "ignore_order": json.dumps(bool(std.get("ignore_order", False))),
            "condition_cols": json.dumps(std.get("condition_cols") or [])}
    d = out / iid
    if d.exists():
        shutil.rmtree(d)
    for src in TEMPLATE.rglob("*"):
        if src.is_file():
            dst = d / src.relative_to(TEMPLATE)
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_text(Template(src.read_text()).substitute(vals))
            dst.chmod(src.stat().st_mode)
    (d / "environment" / "data").mkdir(parents=True)
    shutil.copy2(db, d / "environment" / "data" / db.name)
    shutil.copy2(HERE / "compare.py", d / "tests" / "compare.py")
    (d / "tests" / "eval.json").write_text(json.dumps(std))
    (d / "tests" / "gold").mkdir()
    for g in golds:
        shutil.copy2(g, d / "tests" / "gold" / g.name)
    shutil.copy2(golds[0], d / "solution" / "gold.csv")
    return d


class Spider2LiteAdapter:
    def __init__(self, output_dir: Path, limit: int | None = None, overwrite: bool = False,
                 task_ids: list[str] | None = None, cache: Path = CACHE):
        self.output_dir, self.limit, self.overwrite, self.task_ids, self.cache = output_dir, limit, overwrite, task_ids, cache

    def eligible_ids(self) -> list[str]:  # upstream jsonl order
        return [i for i, t in _jsonl(self.cache / "spider2-lite.jsonl").items()
                if i.startswith("local") and not t.get("external_knowledge")]

    def run(self) -> list[Path]:
        ids = self.task_ids or self.eligible_ids()  # explicit ids are validated (and refused) by make_task
        done = []
        for iid in ids[: self.limit] if self.limit is not None else ids:
            if (self.output_dir / iid).exists() and not self.overwrite:
                print(f"{iid}: exists, skipped (use --overwrite)")
                continue
            done.append(make_task(iid, self.output_dir, self.cache))
            print(done[-1])
        return done
