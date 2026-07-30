"""Phase 3: execute the plan.

Dry run is the default everywhere; the CLI must pass execute=True to mutate
anything. In dry-run mode the same code path runs, including destination-parent
resolution and duplicate detection, but writes are replaced with placeholder IDs.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime

from .comments import replicate_comments
from .drive import FOLDER_MIME, DriveClient, DriveError
from .state import (
    BLOCKED,
    COPY,
    CREATE_FOLDER,
    DONE,
    FAILED,
    MOVE,
    SHORTCUT,
    SKIP,
    SKIPPED,
    State,
)

log = logging.getLogger(__name__)

DRY_PREFIX = "dryrun:"


@dataclass
class ApplyStats:
    attempted: int = 0
    folders_created: int = 0
    folders_adopted: int = 0
    moved: int = 0
    copied: int = 0
    shortcuts: int = 0
    skipped: int = 0
    failed: int = 0
    comments_copied: int = 0
    errors: list[str] = field(default_factory=list)


class Applier:
    def __init__(
        self,
        client: DriveClient,
        state: State,
        source_root_id: str,
        dest_root_id: str,
        dest_drive_id: str,
        execute: bool = False,
        copy_comments: bool = True,
        allow_duplicates: bool = False,
    ):
        self.client = client
        self.state = state
        self.source_root_id = source_root_id
        self.dest_root_id = dest_root_id
        self.dest_drive_id = dest_drive_id
        self.execute = execute
        self.copy_comments = copy_comments
        self.allow_duplicates = allow_duplicates
        self._dry_ids: dict[str, str] = {}

    # -- helpers -----------------------------------------------------------

    def _dest_id(self, source_id: str) -> str | None:
        if source_id == self.source_root_id:
            return self.dest_root_id
        return self.state.dest_id_of(source_id) or self._dry_ids.get(source_id)

    def _record(self, source_id: str, status: str, dest_id: str | None = None, **kw) -> None:
        if self.execute:
            self.state.mark(source_id, status, dest_id=dest_id, **kw)
        elif dest_id:
            self._dry_ids[source_id] = dest_id

    def _existing_child(self, parent_id: str, name: str, mime_type: str | None = None):
        if parent_id.startswith(DRY_PREFIX):
            return None  # parent does not exist yet in a dry run
        return self.client.find_child(parent_id, name, mime_type, drive_id=self.dest_drive_id)

    # -- main loop ---------------------------------------------------------

    def run(self, path_prefix: str | None = None, limit: int | None = None) -> ApplyStats:
        stats = ApplyStats()
        rows = self.state.planned(path_prefix)
        if limit is not None:
            rows = rows[:limit]

        for row in rows:
            source_id = row["source_id"]
            item = self.state.get_item(source_id)
            if item is None:
                continue
            stats.attempted += 1

            if row["action"] == SKIP:
                log.info("SKIP   %s (%s)", item.path, row["reason"])
                stats.skipped += 1
                self._record(source_id, SKIPPED)
                continue

            dest_parent = self._dest_id(item.parent_id or "")
            if dest_parent is None:
                msg = f"parent not yet migrated for {item.path}"
                log.warning("BLOCK  %s", msg)
                self._record(source_id, BLOCKED, error=msg)
                stats.errors.append(msg)
                continue

            try:
                self._apply_one(row["action"], item, dest_parent, stats)
            except DriveError as exc:
                log.error("FAIL   %s: %s", item.path, exc)
                stats.failed += 1
                stats.errors.append(f"{item.path}: {exc}")
                self._record(source_id, FAILED, error=str(exc))
            except Exception as exc:  # noqa: BLE001
                log.exception("FAIL   %s", item.path)
                stats.failed += 1
                stats.errors.append(f"{item.path}: {exc}")
                self._record(source_id, FAILED, error=str(exc))

        return stats

    def _apply_one(self, action: str, item, dest_parent: str, stats: ApplyStats) -> None:
        if action == CREATE_FOLDER:
            existing = self._existing_child(dest_parent, item.name, FOLDER_MIME)
            if existing:
                log.info("ADOPT  %s", item.path)
                stats.folders_adopted += 1
                self._record(item.id, DONE, dest_id=existing["id"])
                return
            if not self.execute:
                log.info("+FOLDER %s", item.path)
                stats.folders_created += 1
                self._record(item.id, DONE, dest_id=DRY_PREFIX + item.id)
                return
            created = self.client.create_folder(item.name, dest_parent)
            log.info("MKDIR  %s", item.path)
            stats.folders_created += 1
            self._record(item.id, DONE, dest_id=created["id"])
            return

        # Everything below is a file-level operation; guard against duplicates.
        if not self.allow_duplicates:
            existing = self._existing_child(dest_parent, item.name)
            if existing:
                log.info("EXISTS %s (already in destination)", item.path)
                stats.skipped += 1
                self._record(
                    item.id, SKIPPED, dest_id=existing["id"], error="already in destination"
                )
                return

        if action == MOVE:
            if not self.execute:
                log.info("MOVE   %s", item.path)
                stats.moved += 1
                self._record(item.id, DONE, dest_id=item.id)
                return
            moved = self.client.move_file(item.id, dest_parent, item.parent_id)
            log.info("MOVE   %s", item.path)
            stats.moved += 1
            self._record(item.id, DONE, dest_id=moved["id"])
            return

        if action == SHORTCUT:
            if not self.execute:
                log.info("LINK   %s", item.path)
                stats.shortcuts += 1
                self._record(item.id, DONE, dest_id=DRY_PREFIX + item.id)
                return
            if not item.shortcut_target:
                self._record(item.id, SKIPPED, error="shortcut target unknown")
                stats.skipped += 1
                return
            sc = self.client.create_shortcut(item.name, dest_parent, item.shortcut_target)
            stats.shortcuts += 1
            self._record(item.id, DONE, dest_id=sc["id"])
            return

        if action == COPY:
            if not self.execute:
                log.info("COPY   %s (owner: %s)", item.path, item.owner_email)
                stats.copied += 1
                result = (
                    replicate_comments(self.client, item.id, "", dry_run=True)
                    if self.copy_comments
                    else None
                )
                if result:
                    stats.comments_copied += result.total
                self._record(item.id, DONE, dest_id=DRY_PREFIX + item.id)
                return
            copied = self.client.copy_file(
                item.id,
                item.name,
                dest_parent,
                description=_provenance(item),
                app_properties={
                    "migrationSourceId": item.id,
                    "migrationSourceOwner": (item.owner_email or "")[:120],
                },
            )
            total = copied_n = 0
            if self.copy_comments:
                res = replicate_comments(self.client, item.id, copied["id"])
                total, copied_n = res.total, res.copied
                stats.comments_copied += copied_n
                stats.errors.extend(res.errors)
            log.info("COPY   %s (%d/%d comments)", item.path, copied_n, total)
            stats.copied += 1
            self._record(
                item.id, DONE, dest_id=copied["id"], comments_total=total, comments_copied=copied_n
            )
            return

        raise ValueError(f"unknown action {action}")


def _provenance(item) -> str:
    today = datetime.now(UTC).date().isoformat()
    parts = [
        f"Copied into the destination shared drive on {today}.",
        f"Original owner: {item.owner_name or ''} <{item.owner_email or 'unknown'}>.",
        f"Original created: {(item.created_time or '')[:10]}; "
        f"last modified: {(item.modified_time or '')[:10]}.",
    ]
    if item.web_view_link:
        parts.append(f"Original file: {item.web_view_link}")
    parts.append(
        "Revision history could not be transferred because this account does not own "
        "the original; comments were replicated with original authorship noted in text."
    )
    return " ".join(parts)
