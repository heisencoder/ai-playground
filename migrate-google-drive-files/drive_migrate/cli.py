"""Command line interface.

Typical sequence:

    drive-migrate preflight
    drive-migrate scan
    drive-migrate plan
    drive-migrate apply --subtree "2019/Budget"          # dry run
    drive-migrate apply --subtree "2019/Budget" --execute
    drive-migrate report
    drive-migrate apply --execute                        # the whole tree
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

from drive_migrate.apply import Applier
from drive_migrate.auth import build_service
from drive_migrate.drive import FOLDER_MIME, DriveClient
from drive_migrate.plan import build_plan
from drive_migrate.report import summary, write_csv
from drive_migrate.scan import scan
from drive_migrate.state import State

log = logging.getLogger("drive_migrate")


# -- resolution ------------------------------------------------------------


def resolve_source(client: DriveClient, state: State, args) -> str:
    if args.source_id:
        return args.source_id
    cached = state.get_meta("source_root_id")
    if cached and not args.source_name:
        return cached
    name = args.source_name
    if not name:
        raise SystemExit("Specify the source folder with --source-name (or --source-id).")
    matches = client.find_my_drive_folder(name)
    if not matches:
        raise SystemExit(f"No folder named {name!r} found. Pass --source-id instead.")
    if len(matches) > 1:
        listing = "\n".join(f"  {m['id']}  {m.get('webViewLink', '')}" for m in matches)
        raise SystemExit(f"{len(matches)} folders named {name!r}:\n{listing}\nPass --source-id.")
    return matches[0]["id"]


def resolve_dest(client: DriveClient, state: State, args, execute: bool = False) -> tuple[str, str]:
    """Return (dest_folder_id, drive_id)."""
    if args.dest_folder_id and args.dest_drive_id:
        return args.dest_folder_id, args.dest_drive_id
    cached = state.get_meta("dest")
    if cached and not (args.dest_drive_name or args.dest_folder_id):
        return cached["folder_id"], cached["drive_id"]

    if args.dest_drive_id:
        drive = client.get_drive(args.dest_drive_id)
    else:
        if not args.dest_drive_name:
            raise SystemExit(
                "Specify the destination shared drive with --dest-drive-name "
                "(or --dest-drive-id)."
            )
        drive = client.find_drive_by_name(args.dest_drive_name)
        if not drive:
            raise SystemExit(
                f"Shared drive {args.dest_drive_name!r} not visible to this "
                "account. Ask a drive manager to add you as Content manager."
            )
        drive = client.get_drive(drive["id"])
    drive_id = drive["id"]

    folder_id = args.dest_folder_id or drive_id
    if args.dest_path:
        for part in args.dest_path.strip("/").split("/"):
            child = client.find_child(folder_id, part, FOLDER_MIME, drive_id=drive_id)
            if child:
                folder_id = child["id"]
            elif execute:
                folder_id = client.create_folder(part, folder_id)["id"]
            else:
                raise SystemExit(
                    f"Destination subfolder {args.dest_path!r} does not exist. "
                    "Create it in the Drive UI, or rerun with --execute to create it."
                )
    return folder_id, drive_id


def connect(args) -> tuple[DriveClient, State]:
    service = build_service(args.credentials, args.token, login_hint=args.account)
    client = DriveClient(service)
    state = State(args.db)
    return client, state


# -- commands --------------------------------------------------------------


def cmd_preflight(args) -> int:
    client, state = connect(args)
    user = client.about()
    print(f"Authenticated as: {user['emailAddress']} ({user.get('displayName', '')})")
    if args.account and user["emailAddress"].lower() != args.account.lower():
        print(
            f"WARNING: expected {args.account}. Delete {args.token} and re-run to switch account."
        )

    source_id = resolve_source(client, state, args)
    src = client.get_file(source_id)
    print(f"Source folder:    {src['name']}  ({source_id})")

    dest_folder_id, drive_id = resolve_dest(client, state, args, execute=args.execute)
    drive = client.get_drive(drive_id)
    caps = drive.get("capabilities", {})
    print(f"Shared drive:     {drive['name']}  ({drive_id})")
    print(f"Destination:      {dest_folder_id}")
    print(f"  canAddChildren: {caps.get('canAddChildren')}")
    print(f"  canEdit:        {caps.get('canEdit')}")
    if not caps.get("canAddChildren"):
        print(
            "\nYou lack write access to the shared drive. A drive manager must add "
            f"{user['emailAddress']} as Content manager or Manager."
        )
        return 1

    state.set_meta("source_root_id", source_id)
    state.set_meta("dest", {"folder_id": dest_folder_id, "drive_id": drive_id})
    state.set_meta("account", user["emailAddress"])

    if args.roundtrip:
        print("\nRound-trip test (creates then leaves a scratch folder in the shared drive):")
        scratch = client.create_folder("_migration-preflight", dest_folder_id)
        print(f"  created scratch folder {scratch['id']}")
        probe = client.create_folder("_probe", scratch["id"])
        print(f"  created nested folder  {probe['id']}")
        print("  delete _migration-preflight manually when satisfied")
    print("\nPreflight OK.")
    return 0


def cmd_scan(args) -> int:
    client, state = connect(args)
    source_id = resolve_source(client, state, args)
    state.set_meta("source_root_id", source_id)
    n = scan(client, state, source_id, max_depth=args.max_depth)
    print(f"Inventoried {n:,} items ({client.call_count} API calls).")
    print(summary(state))
    return 0


def cmd_plan(args) -> int:
    _, state = connect(args) if args.online else (None, State(args.db))
    if state.count_items() == 0:
        raise SystemExit("Inventory is empty. Run `drive-migrate scan` first.")
    counts = build_plan(state, path_prefix=args.subtree)
    print("Planned:", ", ".join(f"{k}={v}" for k, v in sorted(counts.items())))
    print(summary(state))
    return 0


def cmd_apply(args) -> int:
    client, state = connect(args)
    source_id = resolve_source(client, state, args)
    dest_folder_id, drive_id = resolve_dest(client, state, args, execute=args.execute)

    if not state.planned(args.subtree):
        print("Nothing pending. Run `scan` and `plan`, or check --subtree spelling.")
        return 0

    mode = "EXECUTE" if args.execute else "DRY RUN"
    print(f"=== {mode} ===  source={source_id} dest={dest_folder_id} drive={drive_id}")
    if args.execute and not args.yes:
        confirm = input("Type 'migrate' to proceed: ")
        if confirm.strip() != "migrate":
            print("Aborted.")
            return 1

    applier = Applier(
        client=client,
        state=state,
        source_root_id=source_id,
        dest_root_id=dest_folder_id,
        dest_drive_id=drive_id,
        execute=args.execute,
        copy_comments=not args.no_comments,
        allow_duplicates=args.allow_duplicates,
    )
    stats = applier.run(path_prefix=args.subtree, limit=args.limit)

    print(
        f"\nattempted={stats.attempted} folders_created={stats.folders_created} "
        f"folders_adopted={stats.folders_adopted} moved={stats.moved} copied={stats.copied} "
        f"shortcuts={stats.shortcuts} skipped={stats.skipped} failed={stats.failed} "
        f"comments={stats.comments_copied}"
    )
    if stats.errors:
        print(f"\n{len(stats.errors)} problem(s):")
        for e in stats.errors[:40]:
            print(f"  - {e}")
        if len(stats.errors) > 40:
            print(f"  ... and {len(stats.errors) - 40} more (see the CSV report)")
    if not args.execute:
        print("\nNothing was changed. Re-run with --execute to apply.")
    return 1 if stats.failed else 0


def cmd_report(args) -> int:
    state = State(args.db)
    out = write_csv(state, args.out)
    print(summary(state))
    print(f"\nWrote {out}")
    return 0


# -- argument parsing ------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="drive-migrate", description=__doc__)
    p.add_argument("--db", default=".migrate/state.sqlite")
    p.add_argument("--credentials", default="credentials.json")
    p.add_argument("--token", default=".migrate/token.json")
    p.add_argument("--account", help="expected Google account")
    p.add_argument("--source-id")
    p.add_argument("--source-name")
    p.add_argument("--dest-drive-name")
    p.add_argument("--dest-drive-id")
    p.add_argument("--dest-folder-id")
    p.add_argument("--dest-path", help="subfolder path inside the shared drive")
    p.add_argument("-v", "--verbose", action="store_true")
    sub = p.add_subparsers(dest="command", required=True)

    sp = sub.add_parser("preflight", help="verify access and resolve source/destination")
    sp.add_argument(
        "--roundtrip", action="store_true", help="create a scratch folder as a live test"
    )
    sp.add_argument("--execute", action="store_true", help="allow creating --dest-path folders")
    sp.set_defaults(func=cmd_preflight)

    sp = sub.add_parser("scan", help="inventory the source tree (read-only)")
    sp.add_argument("--max-depth", type=int)
    sp.set_defaults(func=cmd_scan)

    sp = sub.add_parser("plan", help="classify every item into an action")
    sp.add_argument("--subtree", help="limit to a relative path under the source root")
    sp.add_argument("--online", action="store_true", help="authenticate (not required)")
    sp.set_defaults(func=cmd_plan, online=False)

    sp = sub.add_parser("apply", help="execute the plan (dry run unless --execute)")
    sp.add_argument("--execute", action="store_true")
    sp.add_argument("--yes", action="store_true", help="skip the confirmation prompt")
    sp.add_argument("--subtree")
    sp.add_argument("--limit", type=int)
    sp.add_argument("--no-comments", action="store_true")
    sp.add_argument("--allow-duplicates", action="store_true")
    sp.set_defaults(func=cmd_apply)

    sp = sub.add_parser("report", help="write a CSV manifest")
    sp.add_argument("--out", default="migration-report.csv")
    sp.set_defaults(func=cmd_report)
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)-7s %(message)s",
        datefmt="%H:%M:%S",
    )
    for attr, default in (("subtree", None), ("execute", False)):
        if not hasattr(args, attr):
            setattr(args, attr, default)
    Path(args.db).parent.mkdir(parents=True, exist_ok=True)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
