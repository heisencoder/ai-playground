"""Phase 1: walk the source folder and record every descendant in the state DB.

Read-only. Safe to run repeatedly.
"""

from __future__ import annotations

import logging

from .drive import FOLDER_MIME, SHORTCUT_MIME, DriveClient
from .state import Item, State

log = logging.getLogger(__name__)


def scan(client: DriveClient, state: State, root_id: str, max_depth: int | None = None) -> int:
    """Populate items table. Returns number of items recorded."""
    state.clear_inventory()
    queue: list[tuple[str, str, int]] = [(root_id, "", 0)]  # (folder_id, path, depth)
    seen: set[str] = {root_id}
    count = 0

    while queue:
        folder_id, base_path, depth = queue.pop(0)
        if max_depth is not None and depth > max_depth:
            continue
        for f in client.list_children(folder_id):
            if f["id"] in seen:
                log.warning("Cycle or duplicate parent detected at %s; skipping", f["id"])
                continue
            seen.add(f["id"])
            item = to_item(f, parent_id=folder_id, base_path=base_path, depth=depth + 1)
            state.upsert_item(item)
            count += 1
            if item.is_folder:
                queue.append((item.id, item.path, depth + 1))
        state.commit()
        log.info("scanned %s (%d items so far)", base_path or "/", count)

    state.commit()
    return count


def to_item(f: dict, parent_id: str, base_path: str, depth: int) -> Item:
    caps = f.get("capabilities") or {}
    owners = f.get("owners") or [{}]
    owner = owners[0]
    name = f.get("name", "(unnamed)")
    path = f"{base_path}/{name}" if base_path else name
    size = f.get("size")
    return Item(
        id=f["id"],
        name=name,
        mime_type=f.get("mimeType", ""),
        parent_id=parent_id,
        path=path,
        depth=depth,
        is_folder=f.get("mimeType") == FOLDER_MIME,
        owned_by_me=bool(f.get("ownedByMe", False)),
        owner_email=owner.get("emailAddress"),
        owner_name=owner.get("displayName"),
        size=int(size) if size is not None else None,
        modified_time=f.get("modifiedTime"),
        created_time=f.get("createdTime"),
        can_copy=bool(caps.get("canCopy", True)),
        can_move_out=bool(caps.get("canMoveItemOutOfDrive", False)),
        shortcut_target=(f.get("shortcutDetails") or {}).get("targetId")
        if f.get("mimeType") == SHORTCUT_MIME
        else None,
        web_view_link=f.get("webViewLink"),
    )
