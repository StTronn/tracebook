"""Review comments on notebook blocks: left in the viewer (`tracebook dev`), read and resolved by the agent via the CLI.

Stored in .tracebook/comments.json; every read-modify-write holds the project lock (the dev server and CLI are
separate processes).
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from tracebook.project import Project, ProjectError

MAX_TEXT = 4000


def _path(p: Project):
    return p.dir / "comments.json"


def _load(p: Project) -> dict:
    f = _path(p)
    return json.loads(f.read_text()) if f.exists() else {"next": 1, "items": []}


def _save(p: Project, data: dict) -> None:
    tmp = _path(p).with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=1))
    tmp.replace(_path(p))


def items(p: Project, notebook: str | None = None, include_resolved: bool = False) -> list[dict]:
    """Comments with their block's CURRENT line (from the notebook's last run); `orphan` = the block or notebook is
    gone, so the comment can't be acted on where it was left (the agent should resolve it with a note)."""
    out, lines = [], {}
    nbs = p.notebooks()
    for c in _load(p)["items"]:
        if (notebook is not None and c["notebook"] != notebook) or (not include_resolved and c["status"] != "open"):
            continue
        if c["notebook"] not in lines:
            rp = p.nb(c["notebook"]).results_path if c["notebook"] in nbs else None
            doc = json.loads(rp.read_text()) if rp and rp.exists() else {"blocks": []}
            lines[c["notebook"]] = {b["id"]: b["line"] for b in doc["blocks"]}
        cur = lines[c["notebook"]].get(c["block"])
        out.append({**c, "line": cur or c["line"], "orphan": cur is None})
    return out


def add(p: Project, notebook: str, block: str, text: str) -> dict:
    """Attach a comment to a block of the notebook's last run (the line is taken from that run)."""
    ref = p.nb(notebook)
    text = str(text).strip()
    if not text or len(text) > MAX_TEXT:
        raise ProjectError(f"comment must be 1–{MAX_TEXT} characters")
    doc = json.loads(ref.results_path.read_text()) if ref.results_path.exists() else {"blocks": []}
    b = next((b for b in doc["blocks"] if b["id"] == block), None)
    if not b:
        raise ProjectError(f"no block {block!r} in {ref.key} (as of its last run)")
    with p.lock():
        data = _load(p)
        c = {"id": data["next"], "notebook": ref.key, "path": ref.path.relative_to(p.root).as_posix(), "block": block,
             "line": b["line"], "text": text, "status": "open", "created": _now(), "resolution": None, "resolved": None}
        data["next"] += 1
        data["items"].append(c)
        _save(p, data)
    return c


def resolve(p: Project, cid: int, note: str | None = None) -> dict:
    with p.lock():
        data = _load(p)
        c = next((c for c in data["items"] if c["id"] == cid), None)
        if not c:
            raise ProjectError(f"no comment #{cid}")
        if c["status"] == "resolved":
            raise ProjectError(f"comment #{cid} is already resolved")
        c.update(status="resolved", resolution=(note or "").strip()[:MAX_TEXT] or None, resolved=_now())
        _save(p, data)
    return c


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")
