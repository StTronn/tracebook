"""Spider2-lite grader: `python3 compare.py <answer.csv> <gold_dir> <instance_id> <eval.json>` → prints 1 or 0.

`compare_pandas_table` / `compare_multi_pandas_table` are copied verbatim from Spider2
(xlang-ai/Spider2, spider2-lite/evaluation_suite/evaluate.py, MIT license; commit pinned in the task's task.toml).
Gold resolution mirrors Spider2's `resolve_gold_paths`: <id>.csv, else <id>_a.csv, <id>_b.csv … (any one may match).
A missing/unreadable answer scores 0.
"""
import json
import math
import re
import sys
from pathlib import Path

import pandas as pd


# ---- verbatim from Spider2 evaluate.py ---------------------------------------------------------------------------
def compare_multi_pandas_table(pred: pd.DataFrame, multi_gold, multi_condition_cols=None, multi_ignore_order=False) -> int:
    if not multi_gold:
        return 0

    if multi_condition_cols in (None, [], [[]], [None]):
        multi_condition_cols = [[] for _ in range(len(multi_gold))]
    elif len(multi_gold) > 1 and not all(isinstance(sublist, list) for sublist in multi_condition_cols):
        multi_condition_cols = [multi_condition_cols for _ in range(len(multi_gold))]

    multi_ignore_order = [multi_ignore_order for _ in range(len(multi_gold))]

    for i, gold in enumerate(multi_gold):
        if compare_pandas_table(pred, gold, multi_condition_cols[i], multi_ignore_order[i]):
            return 1
    return 0


def compare_pandas_table(pred: pd.DataFrame, gold: pd.DataFrame, condition_cols=None, ignore_order: bool = False) -> int:
    tolerance = 1e-2

    def normalize(value):
        if pd.isna(value):
            return 0
        return value

    def vectors_match(v1, v2, tol=tolerance, ignore_order_=False):
        v1 = [normalize(x) for x in v1]
        v2 = [normalize(x) for x in v2]

        if ignore_order_:
            v1 = sorted(v1, key=lambda x: (x is None, str(x), isinstance(x, (int, float))))
            v2 = sorted(v2, key=lambda x: (x is None, str(x), isinstance(x, (int, float))))

        if len(v1) != len(v2):
            return False

        for a, b in zip(v1, v2):
            if pd.isna(a) and pd.isna(b):
                continue
            if isinstance(a, (int, float)) and isinstance(b, (int, float)):
                if not math.isclose(float(a), float(b), abs_tol=tol):
                    return False
            elif a != b:
                return False
        return True

    if condition_cols:
        if not isinstance(condition_cols, (list, tuple)):
            condition_cols = [condition_cols]
        gold_cols = gold.iloc[:, condition_cols]
    else:
        gold_cols = gold

    pred_cols = pred
    t_gold_list = gold_cols.transpose().values.tolist()
    t_pred_list = pred_cols.transpose().values.tolist()
    score = 1

    for gold_vector in t_gold_list:
        if not any(vectors_match(gold_vector, pred_vector, ignore_order_=ignore_order) for pred_vector in t_pred_list):
            score = 0
            break

    return score
# ---- end verbatim ------------------------------------------------------------------------------------------------


def gold_paths(gold_dir: Path, instance_id: str) -> tuple[list[Path], bool]:
    base = gold_dir / f"{instance_id}.csv"
    if base.exists():
        return [base], True
    pat = re.compile(rf"^{re.escape(instance_id)}(_[a-z])?\.csv$")
    return sorted(p for p in gold_dir.iterdir() if pat.match(p.name)), False


def score(answer: Path, gold_dir: Path, instance_id: str, standard: dict) -> tuple[int, str]:
    """(score, reason) — same decision procedure as Spider2's exec_result mode."""
    try:
        pred = pd.read_csv(answer)
    except FileNotFoundError:
        return 0, "no answer file"
    except Exception as e:  # empty / malformed CSV
        return 0, f"unreadable answer: {type(e).__name__}: {e}"
    paths, single = gold_paths(gold_dir, instance_id)
    if not paths:
        return 0, "no gold file"
    cond, order = standard.get("condition_cols"), standard.get("ignore_order", False)
    golds = [pd.read_csv(p) for p in paths]
    s = compare_pandas_table(pred, golds[0], cond, order) if single else compare_multi_pandas_table(pred, golds, cond, order)
    return s, "match" if s else "result differs from gold"


if __name__ == "__main__":
    ans, gdir, iid, std = sys.argv[1:5]
    s, why = score(Path(ans), Path(gdir), iid, json.loads(Path(std).read_text()))
    print(why, file=sys.stderr)
    print(s)
