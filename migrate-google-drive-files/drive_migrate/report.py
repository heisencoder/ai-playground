"""Human-readable summaries and a CSV manifest of the migration."""

from __future__ import annotations

import csv
from pathlib import Path

from drive_migrate.state import State

CSV_COLUMNS = [
    "path",
    "name",
    "mime_type",
    "owner_email",
    "owned_by_me",
    "size",
    "modified_time",
    "action",
    "reason",
    "status",
    "dest_id",
    "comments_total",
    "comments_copied",
    "error",
    "web_view_link",
]


def write_csv(state: State, out_path: Path | str) -> Path:
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=CSV_COLUMNS, extrasaction="ignore")
        writer.writeheader()
        for row in state.report_rows():
            writer.writerow({c: row[c] for c in CSV_COLUMNS})
    return out_path


def _fmt_bytes(n: int | None) -> str:
    size = float(n or 0)
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024 or unit == "GB":
            return f"{size:,.1f} {unit}" if unit != "B" else f"{int(size):,} B"
        size /= 1024
    return str(size)


def summary(state: State) -> str:
    lines = [f"Items inventoried: {state.count_items():,}"]

    actions = state.action_counts()
    if actions:
        lines.append("\nPlanned actions:")
        for k, v in sorted(actions.items(), key=lambda kv: -kv[1]):
            lines.append(f"  {k:<14} {v:>6,}")

    statuses = state.status_counts()
    if statuses:
        lines.append("\nStatus:")
        for k, v in sorted(statuses.items(), key=lambda kv: -kv[1]):
            lines.append(f"  {k:<14} {v:>6,}")

    owners = state.owner_breakdown()
    if owners:
        lines.append("\nFiles by owner:")
        for r in owners[:25]:
            who = r["owner_email"] or "(unknown)"
            lines.append(f"  {who:<45} {r['c']:>5,}  {_fmt_bytes(r['bytes'])}")
        if len(owners) > 25:
            lines.append(f"  ... and {len(owners) - 25} more owners")

    return "\n".join(lines)
