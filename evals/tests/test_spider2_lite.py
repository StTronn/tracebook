"""Spider2-lite adapter + grader. Synthetic fixture cache only — no downloaded benchmark data needed."""
import json
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "adapters" / "spider2-lite" / "src"))
from spider2_lite import adapter, compare  # noqa: E402


def _csv(p: Path, text: str) -> Path:
    p.write_text(text)
    return p


@pytest.fixture
def gold(tmp_path):
    d = tmp_path / "gold"
    d.mkdir()
    _csv(d / "t1.csv", "n\n1\n")
    return d


@pytest.mark.parametrize("answer, expected", [
    ("sessions\n1\n", 1),          # header name ignored
    ("n\n1.004\n", 1),             # abs tolerance 1e-2
    ("n\n1.02\n", 0),
    ("id,n\nx,1\n", 1),            # extra column allowed
    ("n\n1\n2\n", 0),              # extra row → vector length differs
    ("n\n3\n", 0),
])
def test_compare_values(tmp_path, gold, answer, expected):
    assert compare.score(_csv(tmp_path / "a.csv", answer), gold, "t1", {"ignore_order": True})[0] == expected


def test_compare_missing_and_unreadable(tmp_path, gold):
    assert compare.score(tmp_path / "nope.csv", gold, "t1", {}) == (0, "no answer file")
    assert compare.score(_csv(tmp_path / "e.csv", ""), gold, "t1", {})[0] == 0
    assert compare.score(_csv(tmp_path / "a.csv", "n\n1\n"), gold, "missing", {}) == (0, "no gold file")


def test_compare_order_and_alternates(tmp_path):
    d = tmp_path / "g"
    d.mkdir()
    _csv(d / "t2_a.csv", "k,v\na,1\nb,2\n")
    _csv(d / "t2_b.csv", "k,v\na,1\nb,3\n")
    swapped = _csv(tmp_path / "a.csv", "k,v\nb,2\na,1\n")
    assert compare.score(swapped, d, "t2", {"ignore_order": True})[0] == 1
    assert compare.score(swapped, d, "t2", {"ignore_order": False})[0] == 0
    assert compare.score(_csv(tmp_path / "b.csv", "k,v\na,1\nb,3\n"), d, "t2", {})[0] == 1   # 2nd alternate
    assert compare.score(_csv(tmp_path / "c.csv", "v\n1\n9\n"), d, "t2", {"condition_cols": [1]})[0] == 0


@pytest.fixture
def cache(tmp_path):
    c = tmp_path / "cache"
    (c / "gold").mkdir(parents=True)
    (c / "localdb").mkdir()
    (c / "COMMIT").write_text("abc123\n")
    rows = [{"instance_id": "local901", "db": "toy", "question": "How many rows?", "external_knowledge": None},
            {"instance_id": "bq001", "db": "ga360", "question": "x", "external_knowledge": None}]
    (c / "spider2-lite.jsonl").write_text("\n".join(map(json.dumps, rows)) + "\n")
    (c / "spider2lite_eval.jsonl").write_text(json.dumps({"instance_id": "local901", "condition_cols": [],
                                                          "ignore_order": True, "toks": "1"}) + "\n")
    _csv(c / "gold" / "local901_a.csv", "n\n2\n")
    con = sqlite3.connect(c / "localdb" / "toy.sqlite")
    con.executescript("CREATE TABLE t(x); INSERT INTO t VALUES (1),(2);")
    con.close()
    return c


def test_adapter_builds_a_gradable_task(tmp_path, cache):
    d = adapter.make_task("local901", tmp_path / "out", cache)
    assert (d / "environment" / "data" / "toy.sqlite").exists()
    assert not list((d / "environment").rglob("*.csv"))                     # gold never in the agent's image
    instr = (d / "instruction.md").read_text()
    assert "How many rows?" in instr and "/app/data/toy.sqlite" in instr and "/app/answer.csv" in instr
    toml = (d / "task.toml").read_text()
    assert 'name = "spider2-lite/local901"' in toml and "abc123" in toml
    assert json.loads((d / "tests" / "eval.json").read_text()) == {"condition_cols": [], "ignore_order": True}
    run = lambda ans: subprocess.run([sys.executable, d / "tests" / "compare.py", ans, d / "tests" / "gold",
                                      "local901", d / "tests" / "eval.json"], capture_output=True, text=True).stdout.strip()
    assert run(d / "solution" / "gold.csv") == "1"                           # oracle answer passes the grader
    assert run(_csv(tmp_path / "wrong.csv", "n\n3\n")) == "0"
    assert "${" not in "".join(p.read_text() for p in d.rglob("*") if p.suffix in (".md", ".toml", ".sh"))


def test_adapter_refuses_cloud_and_unknown_tasks(tmp_path, cache):
    with pytest.raises(SystemExit, match="only local SQLite"):
        adapter.make_task("bq001", tmp_path, cache)
    with pytest.raises(SystemExit, match="not in spider2-lite"):
        adapter.make_task("local999", tmp_path, cache)


def test_bundle_builds_one_gradable_multi_question_task(tmp_path, cache):
    rows = [{"instance_id": "local901", "db": "toy", "question": "How many rows?", "external_knowledge": None},
            {"instance_id": "local902", "db": "toy", "question": "Max x?", "external_knowledge": None},
            {"instance_id": "local903", "db": "other", "question": "x", "external_knowledge": None}]
    (cache / "spider2-lite.jsonl").write_text("\n".join(map(json.dumps, rows)) + "\n")
    _csv(cache / "gold" / "local902.csv", "m\n2\n")
    _csv(cache / "gold" / "local903.csv", "m\n2\n")
    (cache / "localdb" / "other.sqlite").write_bytes(b"")
    bundles = {"toy-pair": {"ids": ["local901", "local902"], "intro": "toy data. Answer:"},
               "mixed": {"ids": ["local901", "local903"], "intro": "x"}}
    d = adapter.make_bundle("toy-pair", tmp_path / "out", cache, bundles)
    instr = (d / "instruction.md").read_text()
    assert "1. How many rows?" in instr and "2. Max x?" in instr and "`/app/answers/q2.csv`" in instr
    assert "local90" not in instr                                            # no Spider2 ids leak to the agent
    assert not list((d / "environment").rglob("*.csv"))
    assert json.loads((d / "tests" / "bundle.json").read_text()) == {"questions": {"q1": "local901", "q2": "local902"}}
    assert "${" not in "".join(p.read_text() for p in d.rglob("*") if p.suffix in (".md", ".toml", ".sh", ".py"))

    def grade(answers: dict[str, str]) -> dict:                             # run grade.py with /tests,/app,/logs remapped
        app, logs = tmp_path / "app" / "answers", tmp_path / "logs" / "verifier"
        for p in (app, logs):
            p.mkdir(parents=True, exist_ok=True)
            for f in p.glob("*"):
                f.unlink()
        for q, text in answers.items():
            _csv(app / f"{q}.csv", text)
        src = (d / "tests" / "grade.py").read_text().replace('"/tests"', repr(str(d / "tests"))) \
            .replace('Path("/tests")', f"Path({str(d / 'tests')!r})").replace("/app/answers", str(app)) \
            .replace("/logs/verifier", str(logs))
        subprocess.run([sys.executable, "-c", src], check=True, capture_output=True)
        return json.loads((logs / "reward.json").read_text())

    oracle = {q: (d / "solution" / "answers" / f"{q}.csv").read_text() for q in ("q1", "q2")}
    assert grade(oracle) == {"q1": 1, "q2": 1, "reward": 1.0}
    assert grade({"q1": oracle["q1"], "q2": "m\n9\n"}) == {"q1": 1, "q2": 0, "reward": 0.5}
    assert grade({"q2": oracle["q2"]}) == {"q1": 0, "q2": 1, "reward": 0.5}   # missing file → 0 for that question only
    with pytest.raises(SystemExit, match="share one db"):
        adapter.make_bundle("mixed", tmp_path / "out", cache, bundles)
    with pytest.raises(SystemExit, match="unknown bundle"):
        adapter.make_bundle("nope", tmp_path / "out", cache, bundles)
