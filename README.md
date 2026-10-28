# tracebook

Agent-native data notebook. You ask Claude Code a question about your data files (CSV, Excel, JSON, SQLite, Parquet). It answers inside a notebook of SQL / Python / `.xlsx`-model blocks run on DuckDB. Every number in the answer traces back to the block that computed it, and you can check it, comment on it, and rerun it on new data.

| Notebook view: blocks, queries, results, data browser | Report view: the same notebook as a shareable report |
|---|---|
| ![notebook view](docs/notebook-view.png) | ![report view](docs/report-view.png) |

![tracebook demo](docs/tracebook_demo.gif)

Full-resolution video: [docs/tracebook_demo.mp4](docs/tracebook_demo.mp4). The screenshots are the example in `examples/razorpay-demo/` (Razorpay checkout funnel from dashboard exports).

## Install
```bash
uv tool install .            # tracebook CLI
tracebook skill install      # agent skill → ~/.claude/skills/tracebook
```

## User flow
1. **Set up a project.** `tracebook init analysis` creates a folder with `data/` (your raw files, never modified), `notebooks/` (markdown notebooks) and `models/` (optional `.xlsx` models).
2. **Bring your data.** Drop exports into `data/` and run `tracebook import data/*`. Import is typed: ambiguous dates or mixed types stop with a `✗` line that names the fix (for example `--types col=date:dmy`) instead of loading wrong values. Known sources (packs, e.g. Razorpay) are recognised and come with their own guide.
3. **Ask Claude Code a question**, e.g. "where do customers drop off in checkout?". With the skill installed, the agent:
   - reads `tracebook schema` and samples the data with `tracebook query`,
   - writes the notebook: SQL / Python / sheet blocks, charts, and a summary sentence whose numbers are references like `{{funnel.paid}}`, not typed-in values,
   - runs `tracebook check` until it reports `✓ 0 error(s)` (it catches broken SQL, missing columns, bad references and type problems, each with a file and line).
4. **Review it.** `tracebook dev` opens the viewer. Click any number to see the query and rows behind it. Switch between the Notebook view (everything) and the Report view (results only). Leave a comment where something looks wrong ("count per user, not per session").
5. **Fix from comments.** On its next turn the agent reads `tracebook comments`, changes the notebook, and resolves each comment with a note saying what changed.
6. **Share.** `tracebook export` writes a self-contained HTML report. `tracebook export --block <id> out.csv` writes one block's result as a CSV.
7. **Rerun on new data.** Import the new export and run `tracebook check`. `tracebook diff` lists which blocks and numbers changed since the previous run.

The agent normally runs all of these commands itself; the full workflow it follows is in `src/tracebook/skill/SKILL.md`.

## Evaluation
The aim is to measure, on benchmark tasks we did not write, whether each layer actually helps:
- **Pack** (`src/tracebook/packs/generic/data-analysis`): a generic data-analysis skill (look at the data first, state the definition, check row counts, verify). Should make answers more correct.
- **Tracebook**: the CLI and its skill. Should keep the answer just as correct and also leave a notebook behind that can be checked, reviewed and rerun.

### How it runs
- **Harness:** [Harbor](https://docs.harborframework.com/). Each task is a folder with `instruction.md`, a Docker environment holding the data, a hidden `tests/` folder with the grader and gold answer, and an oracle solution.
- **Setups:** the task is identical for every setup; only the agent's configuration changes (`evals/configs/`).

  | Setup | What the agent gets |
  |---|---|
  | **CC** | plain Claude Code |
  | **CC+P** | Claude Code + the pack skill |
  | **CC+P+T** | Claude Code + the pack skill + the tracebook CLI, its skill, and a `CLAUDE.md` asking for a notebook |

- **Rules:** the grader is never changed to make a run pass. Every task is first checked with the oracle (must score 1) and with an agent that does nothing (must score 0). Each setup gets 3 attempts per task. Only one thing changes between runs, and each change is logged with its hypothesis and result.
- **What gets measured:**
  - **A, correctness:** the benchmark's own grader, 0 or 1 per attempt.
  - **B, process** (planned): cost, turns, and whether the final answer came from a notebook block or from a side script.
  - **C, trust** (planned): planted faults caught by `check`, numbers a reviewer can trace, review comments fixed, correct reruns on new data.

### The first task: Spider2-lite `local329`
From [Spider2-lite](https://github.com/xlang-ai/Spider2), a public text-to-SQL benchmark. The agent gets a SQLite web-activity log with 19 tables and this question:

> How many unique sessions visited the /regist/input page and then the /regist/confirm page, in that order?

It must write the result as a CSV to `/app/answer.csv`. The grader is Spider2's own result comparison, against the gold answer **1**. The trap: the page visits for the registration form live in `form_log`, one of many similar log tables, and the order of the visits matters.

### Results so far (Claude Haiku 4.5, Claude Code 2.1.312, 3 attempts per setup)
| Setup | Correct | Cost per attempt | Time per attempt | Notes |
|---|---|---|---|---|
| **CC** | 2 / 3 | $0.02–0.06 | 17–38 s | The miss never looked at `form_log` and answered from the wrong table. |
| **CC+P** | 3 / 3 | $0.04–0.05 | 33–40 s | First version: the skill was never loaded (also 2/3). After its description said to load it before any query, it was loaded in 3/3 and all were correct. |
| **CC+P+T** | 3 / 3 | $0.05–0.07 | 33–48 s | Correct every time, but a notebook was written in only 1 of 3 attempts: Tracebook is not yet steering the work. (Run before the setup change that moved `CLAUDE.md` into `/app`; to be re-run.) |

What this shows so far:
1. The pack fixed the one failure, at about 1.25× the total cost ($0.14 vs $0.11 for 3 attempts).
2. Tracebook did not hurt correctness, but it isn't yet the place where the work happens. The next step is for the answer to come from a notebook block (`tracebook export --block`), measured with B.
3. One task is a working end-to-end example, not evidence. Next steps: the four local web-funnel tasks, then MRR (Spider2-DBT) and customer-360 slices, and DABStep for scale.

The full plan is in [`plan.md`](plan.md); background and decisions are in [`data-agent.md`](data-agent.md).

### Running the evals
```bash
evals/adapters/spider2-lite/fetch.sh cafb867313aa local329           # Spider2 files + database (one-time download)
uv run --project evals/adapters/spider2-lite python -m spider2_lite.main --task-ids local329
echo 'ANTHROPIC_API_KEY=...' > evals/.env                             # or CLAUDE_CODE_OAUTH_TOKEN (from `claude setup-token`)
evals/run.sh evals/configs/cc.yaml                                    # also cc-p.yaml, cc-p-t.yaml
evals/run.sh evals/configs/cc.yaml --install-only                     # check setup only, no model calls
harbor view evals/jobs                                                # browse runs and trajectories
```
`evals/run.sh` caches the Linux Claude Code build and tracebook on your machine and mounts them read-only into each trial, so trials install nothing (local Docker only).

## Repository layout
| Path | What |
|---|---|
| `src/tracebook/` | CLI, runtime (import, blocks, `check`), packs, agent skill, built viewer |
| `web/` | viewer source (React + Vite); `npm run build` writes `src/tracebook/viewer/` |
| `tests/` | `uv run pytest` |
| `evals/` | Harbor adapter for Spider2-lite, setup configs, runner |
| `examples/razorpay-demo/` | example workspace (`tracebook import data/*.xlsx && tracebook check` rebuilds it) |
| `docs/` | screenshots, demo video |
