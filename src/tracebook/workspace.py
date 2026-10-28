"""Workspace-level views for the dev server: notebook tree, data browser (schema + preview), settings, creation.

Plain functions over Project so they are testable without HTTP. Reads take the project lock (DuckDB allows one
writer; the dev server's rerun thread writes) and only ever read imported tables in schema `main`.
"""
from __future__ import annotations

import json
import shutil
import sys
import tempfile
from importlib import metadata
from pathlib import Path

from tracebook.core.values import fmt_cell, to_json
from tracebook.project import KEY, NB_DIR, Project, ProjectError, schema_for

PREVIEW_ROWS = 100
DISTINCT_MAX = 10


def _q(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def _results(p: Project, key: str) -> dict | None:
    f = p.nb(key).results_path
    try:
        return json.loads(f.read_text()) if f.exists() else None
    except json.JSONDecodeError:              # mid-write by another process; caller treats as "not run yet"
        return None


def info(p: Project) -> dict:
    """Notebook tree with last-run status, plus read-only settings."""
    nbs = []
    for key, path in p.notebooks().items():
        r = _results(p, key)
        errs = sum(d["severity"] == "error" for d in r["diagnostics"]) if r else 0
        nbs.append({"key": key, "path": path.relative_to(p.root).as_posix(), "title": (r or {}).get("title") or key,
                    "ran": bool(r), "ok": bool(r and r["ok"]), "errors": errs,
                    "warnings": len(r["diagnostics"]) - errs if r else 0, "ranAt": (r or {}).get("ranAt")})
    from tracebook.packs import packs, templates
    return {"name": p.root.name, "timezone": p.config["timezone"], "notebooks": nbs,
            "templates": sorted(templates()), "settings": settings(p, packs())}


def settings(p: Project, pks: dict) -> dict:
    def ver(dist):
        try:
            return metadata.version(dist)
        except metadata.PackageNotFoundError:
            return None
    engines = {d: ver(d) for d in ("tracebook", "duckdb", "pandas", "numpy", "openpyxl", "formualizer", "pyyaml")}
    return {"timezone": p.config["timezone"], "python": sys.version.split()[0], "engines": engines,
            "packs": [{"name": n, "timezone": getattr(pk, "timezone", None)} for n, pk in sorted(pks.items())],
            "pythonBlockNames": ["pd", "Decimal", "TZ", "<upstream blocks and imported tables as DataFrames>"],
            "packages": sorted(({"name": d.metadata["Name"], "version": d.version} for d in metadata.distributions()
                                if d.metadata["Name"]), key=lambda x: x["name"].lower())}


def schema(p: Project) -> dict:
    """Imported tables (shared by all notebooks): columns, types, small value sets, and which blocks read them."""
    tables = p.manifest["tables"]
    used: dict[str, list] = {t: [] for t in tables}
    for key in p.notebooks():
        for b in (_results(p, key) or {}).get("blocks", []):
            for t in b.get("reads", []):
                if t in used:
                    used[t].append({"notebook": key, "block": b["id"]})
    out = []
    if tables:
        with p.lock():
            con = p.connect(read_only=True)
            try:
                for name, t in sorted(tables.items()):
                    cols = []
                    for c in t["columns"]:
                        col = {"name": c["name"], "type": c["type"], "source": c.get("source")}
                        if c["type"] in ("VARCHAR", "BOOLEAN"):
                            vals = con.execute(f"SELECT DISTINCT {_q(c['name'])} FROM main.{_q(name)} WHERE {_q(c['name'])} "
                                               f"IS NOT NULL ORDER BY 1 LIMIT {DISTINCT_MAX + 1}").fetchall()
                            if len(vals) <= DISTINCT_MAX:
                                col["values"] = [fmt_cell(v) for (v,) in vals]
                        cols.append(col)
                    out.append({"name": name, "source": t["source"], "rows": t["rows"],
                                "files": [f["path"] for f in t["files"]], "columns": cols, "usedBy": used[name]})
            finally:
                con.close()
    return {"tables": out}


def preview(p: Project, table: str, limit: int = PREVIEW_ROWS) -> dict:
    """First rows of one imported table (never block tables; read-only)."""
    if table not in p.manifest["tables"]:
        raise ProjectError(f"no imported table {table!r}")
    limit = max(1, min(int(limit), PREVIEW_ROWS))
    with p.lock():
        con = p.connect(read_only=True)
        try:
            cur = con.execute(f"SELECT * FROM main.{_q(table)} LIMIT {limit}")
            cols = [{"name": d[0], "type": str(d[1])} for d in cur.description]
            rows = cur.fetchall()
            n = con.execute(f"SELECT count(*) FROM main.{_q(table)}").fetchone()[0]
        finally:
            con.close()
    return {"table": table, "columns": cols, "rows": [[to_json(v) for v in r] for r in rows],
            "display": [[fmt_cell(v) for v in r] for r in rows], "rowCount": n, "truncated": n > len(rows)}


def new_notebook(p: Project, key: str, tpl: Path | None, demo: bool = False) -> tuple[list[str], list[str]]:
    """Create notebooks/<key>.md (blank or from a template). Template support files (models, demo data) are copied
    only where absent, so a new notebook never overwrites workspace files. → (created, skipped) relative paths."""
    key = key.strip().removesuffix(".md").removeprefix(f"{NB_DIR}/")
    if not KEY.match(key):
        raise ProjectError(f"notebook name {key!r}: use letters, digits, - and _ (folders with /), e.g. growth/cohorts")
    existing = p.notebooks()
    if key in existing or (p.root / NB_DIR / f"{key}.md").exists():
        raise ProjectError(f"notebook {key!r} already exists")
    if clash := next((k for k in existing if schema_for(k) == schema_for(key)), None):
        raise ProjectError(f"notebook {key!r} would collide with {clash!r} (names differ only in case/punctuation)")
    created, skipped = [], []
    if tpl and (tpl / "template.py").exists():
        ns: dict = {}
        exec(compile((tpl / "template.py").read_text(), str(tpl / "template.py"), "exec"), ns)
        with tempfile.TemporaryDirectory() as tmp:
            for rel in ns["setup"](Path(tmp), demo=demo):
                dst = p.root / rel
                if dst.exists():
                    skipped.append(rel)
                    continue
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(Path(tmp) / rel, dst)
                created.append(rel)
    title = key.rsplit("/", 1)[-1].replace("-", " ").replace("_", " ").capitalize()
    f = p.root / NB_DIR / f"{key}.md"
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text((tpl / "notebook.md").read_text() if tpl else f"---\ntitle: {title}\n---\n# {title}\n")
    return [f.relative_to(p.root).as_posix(), *created], skipped
