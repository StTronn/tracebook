"""Workspace layout, notebooks, config, single-writer lock and DuckDB connection.

A workspace holds shared data (imported tables in DuckDB schema `main`) and any number of notebooks:
`notebooks/**/<name>.md` (key = path without .md, e.g. `growth/cohorts`) plus a legacy root `notebook.md`
(key `notebook`). Each notebook's block tables live in their own schema, so block ids never collide across notebooks.
"""
from __future__ import annotations

import fcntl
import json
import re
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path

import duckdb

STATE = ".tracebook"
NB_DIR = "notebooks"
KEY = re.compile(r"^[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*$")


class ProjectError(Exception):
    pass


@dataclass(frozen=True)
class NotebookRef:
    key: str
    path: Path
    schema: str                    # DuckDB schema holding this notebook's block tables
    results_path: Path
    history_dir: Path
    work_dir: Path                 # recalculated sheet-model copies


def schema_for(key: str) -> str:
    return "nb_" + re.sub(r"[^a-z0-9]+", "_", key.lower())


class Project:
    def __init__(self, root: Path):
        self.root = Path(root).resolve()
        self.dir = self.root / STATE

    @classmethod
    def find(cls, start: Path | None = None) -> "Project":
        p = Path(start or Path.cwd()).resolve()
        for d in (p, *p.parents):
            if (d / STATE).is_dir():
                return cls(d)
        raise ProjectError("not a tracebook project (no .tracebook/ here or above); run `tracebook init <dir>`")

    def notebooks(self) -> dict[str, Path]:
        """key → file, sorted. Raises on names that can't be a key or keys whose schemas would collide."""
        found = {"notebook": self.root / "notebook.md"} if (self.root / "notebook.md").is_file() else {}
        base = self.root / NB_DIR
        for f in sorted(base.rglob("*.md")) if base.is_dir() else []:
            key = f.relative_to(base).with_suffix("").as_posix()
            if not KEY.match(key):
                raise ProjectError(f"notebook file {f.relative_to(self.root)} has an unsupported name; "
                                   "use letters, digits, - and _ only")
            if key in found:
                raise ProjectError(f"two notebooks share the key {key!r}: {found[key]} and {f}")
            found[key] = f
        schemas: dict[str, str] = {}
        for key in found:
            if (other := schemas.setdefault(schema_for(key), key)) != key:
                raise ProjectError(f"notebooks {other!r} and {key!r} differ only in case/punctuation; rename one")
        return found

    def nb(self, key: str | None = None) -> NotebookRef:
        """A notebook by key (`growth/cohorts`, `notebooks/growth/cohorts.md` also accepted); default = the only one."""
        nbs = self.notebooks()
        if key is None:
            if len(nbs) != 1:
                raise ProjectError("no notebooks yet; run `tracebook new <name>`" if not nbs else
                                   f"several notebooks; name one of: {', '.join(nbs)}")
            key = next(iter(nbs))
        key = key.removesuffix(".md").removeprefix(f"{NB_DIR}/")
        if key not in nbs:
            raise ProjectError(f"no notebook {key!r}; notebooks: {', '.join(nbs) or 'none'}")
        return NotebookRef(key, nbs[key], schema_for(key), self.dir / "results" / f"{key}.json",
                           self.dir / "history" / key, self.dir / "models" / schema_for(key))

    @property
    def notebook(self) -> Path:            # single-notebook convenience
        return self.nb().path

    @property
    def results_path(self) -> Path:
        return self.nb().results_path

    def _json(self, name: str, default):
        f = self.dir / name
        return json.loads(f.read_text()) if f.exists() else default

    def _write_json(self, name: str, data) -> None:
        tmp = self.dir / (name + ".tmp")
        tmp.write_text(json.dumps(data, indent=1, default=str))
        tmp.replace(self.dir / name)  # atomic: readers never see a half-written file

    @property
    def config(self) -> dict:
        return self._json("config.json", {"timezone": "UTC"})

    def save_config(self, cfg: dict) -> None:
        self._write_json("config.json", cfg)

    @property
    def manifest(self) -> dict:
        return self._json("import.json", {"tables": {}})

    def save_manifest(self, m: dict) -> None:
        self._write_json("import.json", m)

    @contextmanager
    def lock(self):
        """Serialize every DB writer across processes (DuckDB allows one writer)."""
        self.dir.mkdir(exist_ok=True)
        with open(self.dir / "lock", "w") as fh:
            fcntl.flock(fh, fcntl.LOCK_EX)
            try:
                yield
            finally:
                fcntl.flock(fh, fcntl.LOCK_UN)

    def connect(self, read_only: bool = False, schema: str | None = None) -> duckdb.DuckDBPyConnection:
        """schema: a notebook schema to resolve bare names in first (then `main`); created when writable."""
        db = self.dir / "data.duckdb"
        if read_only and not db.exists():
            raise ProjectError("no data imported yet; run `tracebook import <files>`")
        con = duckdb.connect(str(db), read_only=read_only)
        # Session TZ drives date_trunc / ::DATE on TIMESTAMPTZ, so buckets follow the project's local day.
        con.execute(f"SET TimeZone = '{self.config['timezone']}'")
        if schema:
            if not read_only:
                con.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema}"')
            if con.execute("SELECT 1 FROM duckdb_schemas() WHERE schema_name = ?", [schema]).fetchone():
                con.execute(f"SET search_path = '{schema},main'")
        return con
