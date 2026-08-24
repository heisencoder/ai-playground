"""Replicate comment threads onto a copied file.

The Drive API's files.copy does not carry comments across, and there is no API
parameter to make it do so. The best available fidelity is to read the source
threads and re-post them, attributing the original author and timestamp in the
comment body. Consequences to be aware of:

  * Every replicated comment is authored by the account running the migration.
  * Anchors (the highlighted range in a Doc) cannot be reattached, because an
    anchor references a specific revision of the source document. The quoted
    text is preserved inline instead, prefixed with '>'.
  * Resolved threads are re-resolved via a reply with action='resolve'.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from drive_migrate.drive import DriveClient, DriveError

log = logging.getLogger(__name__)

BANNER = "[migrated comment]"


@dataclass
class CommentResult:
    total: int
    copied: int
    errors: list[str]


def render_comment(comment: dict) -> str:
    return _render(comment, BANNER)


def render_reply(reply: dict) -> str:
    return _render(reply, "[migrated reply]")


def _render(c: dict, banner: str) -> str:
    author = (c.get("author") or {}).get("displayName") or "Unknown author"
    when = (c.get("createdTime") or "")[:10]
    lines = [f"{banner} {author}" + (f" — {when}" if when else "")]
    quoted = (c.get("quotedFileContent") or {}).get("value")
    if quoted:
        snippet = quoted if len(quoted) <= 500 else quoted[:497] + "..."
        lines.append("> " + snippet.replace("\n", "\n> "))
    lines.append(c.get("content") or "")
    return "\n".join(lines).strip()


def replicate_comments(
    client: DriveClient, source_id: str, dest_id: str, dry_run: bool = False
) -> CommentResult:
    """Copy all non-deleted comment threads from source_id onto dest_id."""
    try:
        threads = [c for c in client.list_comments(source_id) if not c.get("deleted")]
    except DriveError as exc:  # comments are unsupported for some file types
        return CommentResult(0, 0, [f"list_comments failed: {exc}"])

    result = CommentResult(total=len(threads), copied=0, errors=[])
    if dry_run:
        return result

    for thread in threads:
        try:
            created = client.create_comment(dest_id, render_comment(thread))
            new_id = created["id"]
            for reply in thread.get("replies") or []:
                if reply.get("deleted"):
                    continue
                client.create_reply(dest_id, new_id, render_reply(reply))
            if thread.get("resolved"):
                client.create_reply(
                    dest_id,
                    new_id,
                    f"{BANNER} thread was resolved on the original.",
                    action="resolve",
                )
            result.copied += 1
        except DriveError as exc:
            result.errors.append(f"comment {thread.get('id')}: {exc}")
            log.warning("failed to replicate comment on %s: %s", dest_id, exc)
    return result
