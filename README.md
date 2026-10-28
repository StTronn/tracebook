# tracebook

Agent-native data notebook. An agent (Claude Code) answers data questions in a notebook of SQL / Python / `.xlsx`-model blocks over your files (CSV, Excel, JSON, SQLite, Parquet → DuckDB). Every number traces to the block that computed it; the user reviews it in a viewer, comments, and reruns on new data.

Demo (24 s): [docs/tracebook_demo.mp4](docs/tracebook_demo.mp4)

## Install
```bash
uv tool install .            # tracebook CLI
tracebook skill install      # agent skill → ~/.claude/skills/tracebook
```

## Use
```bash
tracebook init analysis --tz Asia/Kolkata && cd analysis
tracebook import data/*.csv              # typed import; ✗ lines = nothing loaded for that table
tracebook schema                         # tables, columns, types
tracebook check                          # run all blocks; exit 0 = clean
tracebook dev                            # live viewer: click a number → its query; leave comments
tracebook export                         # dist/index.html; --block <id> out.csv for one result
tracebook diff                           # per-block changes vs the previous run
```
Normally the agent runs these; see `src/tracebook/skill/SKILL.md`. Example workspace: `examples/razorpay-demo/` (`tracebook import` + `check` to rebuild its state).

## Layout
| Path | What |
|---|---|
| `src/tracebook/` | CLI, runtime (import, blocks, `check`), packs (`packs/`), skill, built viewer |
| `web/` | viewer source (React + Vite); `npm run build` → `src/tracebook/viewer/` |
| `tests/` | `uv run pytest` |
| `evals/` | Harbor evals: Spider2-lite adapter, setups CC / CC+P / CC+P+T (`evals/run.sh evals/configs/cc.yaml`) |
| `plan.md` | tracer-bullet plan: outcome, user journey ↔ evals, increments |
| `data-agent.md` | background: benchmarks, packs, prior work, decisions |

## Evals (short)
Same task for every setup, grader untouched, 3 attempts. `evals/run.sh <config>` caches the Linux Claude Code build and tracebook on the host and mounts them read-only into each trial (local Docker). Fetch tasks first: `evals/adapters/spider2-lite/fetch.sh <commit> local329`, then generate them with the adapter (`evals/adapters/spider2-lite/README.md`). Secrets go in `evals/.env` (gitignored).
