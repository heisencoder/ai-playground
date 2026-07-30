"""Phase 2: turn the inventory into a per-item action plan.

Pure logic over the state DB — no network calls — so it is fully unit-testable.

Decision table
--------------
folder                          -> CREATE_FOLDER (never moved wholesale; see note)
shortcut                        -> SHORTCUT (recreate pointing at same target)
file, owned by me, movable      -> MOVE   (keeps file ID, revisions, comments, links)
file, owned by me, not movable  -> COPY   (rare; e.g. blocked by admin policy)
file, not owned, copyable       -> COPY   (+ comment replication; revisions are lost)
file, not owned, not copyable   -> SKIP   (owner disabled copy, or type can't be copied)

Note on folders: a folder you own could in principle be moved in one call, but
Drive rejects the move if the folder contains items owned by anyone else, and a
partial failure mid-tree is hard to reason about. Recreating folders and moving
files individually is slower but deterministic and resumable.
"""

from __future__ import annotations

from .drive import FOLDER_MIME, SHORTCUT_MIME, UNCOPYABLE_MIMES
from .state import COPY, CREATE_FOLDER, MOVE, SHORTCUT, SKIP, Item, State


def classify(item: Item) -> tuple[str, str]:
    """Return (action, reason)."""
    if item.mime_type == FOLDER_MIME:
        return CREATE_FOLDER, "folder structure recreated in destination"
    if item.mime_type == SHORTCUT_MIME:
        return SHORTCUT, "shortcut recreated pointing at original target"
    if item.mime_type in UNCOPYABLE_MIMES and not item.owned_by_me:
        return SKIP, f"{item.mime_type} cannot be copied via the Drive API"
    if item.owned_by_me:
        if item.can_move_out:
            return MOVE, "owned by me; move preserves file ID, revisions and comments"
        return COPY, "owned by me but move blocked (canMoveItemOutOfDrive=false)"
    if not item.can_copy:
        owner = item.owner_email or "another user"
        return SKIP, f"owned by {owner} and copying is disabled on the file"
    return COPY, f"owned by {item.owner_email or 'another user'}; copy + replicated comments"


def build_plan(state: State, path_prefix: str | None = None) -> dict[str, int]:
    """Write actions for every inventoried item. Completed actions are left alone."""
    counts: dict[str, int] = {}
    for item in state.iter_items(path_prefix):
        action, reason = classify(item)
        state.put_action(item.id, action, reason)
        counts[action] = counts.get(action, 0) + 1
    state.commit()
    return counts
