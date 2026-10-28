"""Score /app/answers/<q>.csv against Spider2 gold per question (bundle.json: q → instance id) with compare.score."""
import json
import sys
from pathlib import Path

sys.path.insert(0, "/tests")
import compare  # noqa: E402

T = Path("/tests")
b = json.loads((T / "bundle.json").read_text())
r = {}
for q, iid in b["questions"].items():
    s, why = compare.score(Path(f"/app/answers/{q}.csv"), T / "gold", iid, json.loads((T / f"eval_{iid}.json").read_text()))
    r[q] = s
    print(f"{q} ({iid}): {s} {why}")
r["reward"] = sum(r.values()) / len(b["questions"])
Path("/logs/verifier/reward.json").write_text(json.dumps(r))
