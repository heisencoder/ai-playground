"""SQLite state store: the inventory, the plan, and per-item execution status.

Keeping state on disk makes runs resumable and makes a dry run's output
inspectable with plain SQL before anything is executed.
"""

from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS items (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    mime_type       TEXT NOT NULL,
    parent_id       TEXT,
    path            TEXT NOT NULL,
    depth           INTEGER NOT NULL,
    is_folder       INTEGER NOT NULL,
    owned_by_me     INTEGER NOT NULL,
    owner_email     TEXT,
    owner_name      TEXT,
    size            INTEGER,
    modified_time   TEXT,
    created_time    TEXT,
    can_copy        INTEGER,
    can_move_out    INTEGER,
    shortcut_target TEXT,
    web_view_link   TEXT
);

CREATE TABLE IF NOT EXISTS actions (
    source_id       TEXT PRIMARY KEY REFERENCES items(id),
    action          TEXT NOT NULL,
    reason          TEXT,
    status          TEXT NOT NULL DEFAULT 'PENDING',
    dest_id         TEXT,
    comments_total  INTEGER DEFAULT 0,
    comments_copied INTEGER DEFAULT 0,
    error           TEXT,
    updated_at      TEXT
);

CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);

CREATE INDEX IF NOT EXISTS idx_items_path ON items(path);
CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
"""

# Action kinds
CREATE_FOLDER = "CREATE_FOLDER"
MOVE = "MOVE"
COPY = "COPY"
SHORTCUT = "SHORTCUT"
SKIP = "SKIP"

# Statuses
PENDING = "PENDING"
DONE = "DONE"
FAILED = "FAILED"
SKIPPED = "SKIPPED"
BLOCKED = "BLOCKED"


@dataclass(frozen=True)
class Item:
    id: str
    name: str
    mime_type: str
    parent_id: str | None
    path: str
    depth: int
    is_folder: bool
    owned_by_me: bool
    owner_email: str | None
    owner_name: str | None
    size: int | None
    modified_time: str | None
    created_time: str | None
    can_copy: bool
    can_move_out: bool
    shortcut_target: str | None
    web_view_link: str | None


@dataclass(frozen=True)
class Action:
    source_id: str
    action: str
    reason: str | None
    status: str
    dest_id: str | None


def _now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


class State:
    def __init__(self, path: Path | str):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(self.path)
        self.db.row_factory = sqlite3.Row
        self.db.executescript(SCHEMA)
        self.db.commit()

    def close(self) -> None:
        self.db.close()

    # -- meta --------------------------------------------------------------

    def set_meta(self, key: str, value) -> None:
        self.db.execute(
            "INSERT INTO meta(key,value) VALUES(?,?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, json.dumps(value)),
        )
        self.db.commit()

    def get_meta(self, key: str, default=None):
        row = self.db.execute("SELECT value FROM meta WHERE key=?", (key,)).fetchone()
        return json.loads(row["value"]) if row else default

    # -- inventory ---------------------------------------------------------

    def clear_inventory(self) -> None:
        self.db.executescript("DELETE FROM actions; DELETE FROM items;")
        self.db.commit()

    def upsert_item(self, item: Item) -> None:
        self.db.execute(
            """INSERT INTO items
               (id,name,mime_type,parent_id,path,depth,is_folder,owned_by_me,owner_email,
                owner_name,size,modified_time,created_time,can_copy,can_move_out,
                shortcut_target,web_view_link)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(id) DO UPDATE SET
                 name=excluded.name, path=excluded.path, depth=excluded.depth,
                 parent_id=excluded.parent_id, owned_by_me=excluded.owned_by_me""",
            (
                item.id,
                item.name,
                item.mime_type,
                item.parent_id,
                item.path,
                item.depth,
                int(item.is_folder),
                int(item.owned_by_me),
                item.owner_email,
                item.owner_name,
                item.size,
                item.modified_time,
                item.created_time,
                int(item.can_copy),
                int(item.can_move_out),
                item.shortcut_target,
                item.web_view_link,
            ),
        )

    def commit(self) -> None:
        self.db.commit()

    def get_item(self, item_id: str) -> Item | None:
        row = self.db.execute("SELECT * FROM items WHERE id=?", (item_id,)).fetchone()
        return _row_to_item(row) if row else None

    def iter_items(self, path_prefix: str | None = None) -> list[Item]:
        sql = "SELECT * FROM items"
        args: tuple = ()
        if path_prefix:
            sql += " WHERE path = ? OR path LIKE ?"
            args = (path_prefix, path_prefix.rstrip("/") + "/%")
        sql += " ORDER BY is_folder DESC, depth ASC, path ASC"
        return [_row_to_item(r) for r in self.db.execute(sql, args)]

    def count_items(self) -> int:
        return self.db.execute("SELECT COUNT(*) c FROM items").fetchone()["c"]

    # -- plan --------------------------------------------------------------

    def clear_plan(self) -> None:
        self.db.execute("DELETE FROM actions")
        self.db.commit()

    def put_action(self, source_id: str, action: str, reason: str | None) -> None:
        """Insert a planned action, preserving status/dest_id of already-completed work."""
        self.db.execute(
            """INSERT INTO actions(source_id,action,reason,status,updated_at)
               VALUES(?,?,?,'PENDING',?)
               ON CONFLICT(source_id) DO UPDATE SET
                 action=excluded.action, reason=excluded.reason, updated_at=excluded.updated_at
               WHERE actions.status != 'DONE'""",
            (source_id, action, reason, _now()),
        )

    def mark(
        self,
        source_id: str,
        status: str,
        dest_id: str | None = None,
        error: str | None = None,
        comments_total: int | None = None,
        comments_copied: int | None = None,
    ) -> None:
        self.db.execute(
            """UPDATE actions SET status=?, dest_id=COALESCE(?,dest_id), error=?,
                 comments_total=COALESCE(?,comments_total),
                 comments_copied=COALESCE(?,comments_copied), updated_at=?
               WHERE source_id=?""",
            (status, dest_id, error, comments_total, comments_copied, _now(), source_id),
        )
        self.db.commit()

    def dest_id_of(self, source_id: str) -> str | None:
        row = self.db.execute(
            "SELECT dest_id FROM actions WHERE source_id=? AND status='DONE'", (source_id,)
        ).fetchone()
        return row["dest_id"] if row else None

    def action_of(self, source_id: str) -> Action | None:
        row = self.db.execute("SELECT * FROM actions WHERE source_id=?", (source_id,)).fetchone()
        if not row:
            return None
        return Action(row["source_id"], row["action"], row["reason"], row["status"], row["dest_id"])

    def planned(
        self, path_prefix: str | None = None, statuses: tuple[str, ...] = (PENDING, BLOCKED, FAILED)
    ):
        """Actions joined to items, ordered so parents are handled before children."""
        sql = (
            "SELECT a.*, i.path, i.depth, i.is_folder FROM actions a "
            "JOIN items i ON i.id=a.source_id "
            f"WHERE a.status IN ({','.join('?' * len(statuses))})"
        )
        args: list = list(statuses)
        if path_prefix:
            sql += " AND (i.path = ? OR i.path LIKE ?)"
            args += [path_prefix, path_prefix.rstrip("/") + "/%"]
        sql += " ORDER BY i.is_folder DESC, i.depth ASC, i.path ASC"
        return list(self.db.execute(sql, args))

    def action_counts(self) -> dict[str, int]:
        rows = self.db.execute("SELECT action, COUNT(*) c FROM actions GROUP BY action")
        return {r["action"]: r["c"] for r in rows}

    def status_counts(self) -> dict[str, int]:
        rows = self.db.execute("SELECT status, COUNT(*) c FROM actions GROUP BY status")
        return {r["status"]: r["c"] for r in rows}

    def owner_breakdown(self) -> list[sqlite3.Row]:
        return list(
            self.db.execute(
                """SELECT owner_email, owner_name, COUNT(*) c, SUM(COALESCE(size,0)) bytes
                   FROM items WHERE is_folder=0 GROUP BY owner_email ORDER BY c DESC"""
            )
        )

    def report_rows(self) -> list[sqlite3.Row]:
        return list(
            self.db.execute(
                """SELECT i.path, i.name, i.mime_type, i.owner_email, i.owned_by_me, i.size,
                          i.modified_time, i.web_view_link,
                          a.action, a.reason, a.status, a.dest_id,
                          a.comments_total, a.comments_copied, a.error
                   FROM items i LEFT JOIN actions a ON a.source_id = i.id
                   ORDER BY i.path"""
            )
        )


def _row_to_item(row: sqlite3.Row) -> Item:
    return Item(
        id=row["id"],
        name=row["name"],
        mime_type=row["mime_type"],
        parent_id=row["parent_id"],
        path=row["path"],
        depth=row["depth"],
        is_folder=bool(row["is_folder"]),
        owned_by_me=bool(row["owned_by_me"]),
        owner_email=row["owner_email"],
        owner_name=row["owner_name"],
        size=row["size"],
        modified_time=row["modified_time"],
        created_time=row["created_time"],
        can_copy=bool(row["can_copy"]),
        can_move_out=bool(row["can_move_out"]),
        shortcut_target=row["shortcut_target"],
        web_view_link=row["web_view_link"],
    )
