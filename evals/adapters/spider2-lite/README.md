## Spider2-lite → Harbor Adapter

## Overview
[Spider2-lite](https://github.com/xlang-ai/Spider2) (547 text-to-SQL tasks over real enterprise DBs), pinned at
`cafb867313aab4e674652054198f383cf4018943`. Adapted: **local SQLite subset only** — 122 tasks (`local*` ids, 135,
minus 13 with `external_knowledge` docs). BigQuery/Snowflake (`bq*`, `sf*`, `ga*`…) and external_knowledge tasks are
refused by the generator.

## Generated Task Structure
`<id>/{task.toml, instruction.md, environment/{Dockerfile, data/<db>.sqlite}, solution/{solve.sh, gold.csv},
tests/{test.sh, compare.py, eval.json, gold/<id>[_x].csv}}`. Agent writes `/app/answer.csv`; gold never enters the
image. Task name `spider2-lite/<id>`. Dockerfile is agent-neutral (python3, pandas==2.2.3, sqlite3, curl, procps).

## Usage: Create Task Directories
```bash
evals/adapters/spider2-lite/fetch.sh cafb867313aab4e674652054198f383cf4018943 local329   # → evals/.cache/spider2
uv run --project evals/adapters/spider2-lite python -m spider2_lite.main --task-ids local329 --overwrite
# bundle (adapter.BUNDLES): several same-db questions as one request, graded per question → reward.json
uv run --project evals/adapters/spider2-lite python -m spider2_lite.main --bundle log-web-funnel --overwrite
```
Flags: `--output-dir` (default `evals/tasks/spider2-lite`), `--task-ids`, `--limit`, `--overwrite`. No `--task-ids` →
all 122 eligible ids (fetch them first).

## Run Evaluation / Harness
```bash
harbor run -c evals/adapters/spider2-lite/run_spider2-lite.yaml          # oracle (default) → 1.0
harbor run -c evals/adapters/spider2-lite/run_spider2-lite.yaml -a nop   # → 0.0
```

## Comparison with Original Benchmark (Parity)
Not run yet; no `parity_experiment.json`.

## Notes
- Grader: `tests/compare.py` = Spider2 `evaluate.py` `compare_pandas_table`/`compare_multi_pandas_table` copied
  verbatim (MIT) + Spider2's gold resolution (`<id>.csv` else any `<id>_a/_b….csv` may match), exec_result mode.
  Reward 1/0; missing/unreadable answer → 0.
- Oracle copies a gold CSV → validates task + grader wiring only.
- No network allowlist (Docker Desktop can't enforce one); see comment in task.toml.

## License
Spider2: MIT.
