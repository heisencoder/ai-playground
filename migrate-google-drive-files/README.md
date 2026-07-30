# Google Drive migration

Moves the contents of a given Google Drive source folder, including sub-folders, into
a Google Workspace Shared Drive, recreating the folder structure along the way.

Four commands, in order: `preflight`, `scan`, `plan`, `apply`. Everything is a
dry run until you pass `--execute`.

---

## What can and cannot be preserved

| Case | Action | File ID | Revision history | Comments | Sharing links |
|---|---|---|---|---|---|
| You own the file | `MOVE` | kept | kept | kept | keep working |
| Someone else owns it | `COPY` | new | **lost** | re-posted as text | old links point at the original |
| Owner disabled copying | `SKIP` | — | — | — | — |
| Google Maps / Sites | `SKIP` | — | — | — | — |

The important limitation: **revision history cannot follow a copy.** Drive has no
API to transfer it, and `files.copy` starts the new file at revision 1. History
survives only when the file is *moved*, and only the owner can move a file.
There is no workaround short of getting ownership first.

Comments are replicated by reading the source threads and re-posting them, since
`files.copy` does not carry comments and has no option to. Each replicated
comment is authored by your account, with the original author and date written
into the comment text, and any highlighted passage quoted inline. Anchors (the
attachment to a specific range of text) cannot be recreated, because an anchor
refers to a revision of the source document that does not exist in the copy.
Resolved threads are re-resolved.

Every copy also gets a `description` recording the original owner, dates, and a
link back to the original file.

### Worth doing before the full run

For files that matter most, ask the current owner to transfer ownership to
your email address first (Drive → Share → make owner). Anything you own
by the time you run `apply` gets moved with full history instead of copied.
Re-run `scan` and `plan` after any transfers so the plan reflects them.

Nothing is deleted. Copies are additive, and moved files remain reachable at the
same file ID, so the source folder stays as an audit trail.

---

## Prerequisites

1. **Shared drive membership.** A manager of the Shared Drive must add
   your email as **Content manager** or **Manager**. Contributor
   is not enough to create the folder structure reliably.
2. **Workspace admin settings.** If you are signing in with a consumer Gmail
   account, it is external to the destination's Workspace domain, so that
   organization's Workspace admin needs to permit:
   - external (non-domain) members on shared drives, and
   - members moving content *into* shared drives (this lives under Drive and
     Docs → Sharing settings; the exact label has changed across Admin console
     revisions — the migration/"move content into shared drives" control).

   `preflight` reports `canAddChildren` for the drive, and `apply --execute` on a
   small subtree will surface any remaining block as a `403`.
3. **Storage.** Files moved or copied into the shared drive consume the
   destination organization's Workspace storage pool, not yours. `scan` prints
   total bytes by owner so you can check the size before committing.

## Setup

### 1. OAuth client

The script authenticates as you, so it needs its own OAuth client:

1. <https://console.cloud.google.com/> → create a project (e.g. `drive-migration`)
2. Enable the **Google Drive API**.
3. OAuth consent screen → **External**, publishing status **Testing**, and add
   your email as a test user.
4. Credentials → Create credentials → **OAuth client ID** → **Desktop app**.
5. Download the JSON, save it next to this README as `credentials.json`.

The scope requested is full `drive`. Narrower scopes do not work: `drive.file`
only sees files this app itself created, and the migration must read files
created by other people.

In Testing mode the refresh token expires after 7 days. If a later run asks you
to sign in again, that is why — nothing is lost, the state database is on disk.

### 2. Install

```bash
uv sync
uv run drive-migrate --help
```

---

## Workflow

```bash
# 0. Confirm identity, membership, and that the names resolve.
uv run drive-migrate preflight

# Optionally prove writes actually work before touching real data:
uv run drive-migrate preflight --roundtrip

# 1. Inventory the source tree. Read-only; safe to repeat.
uv run drive-migrate scan

# 2. Classify every item. No network calls; pure logic over the local database.
uv run drive-migrate plan

# 3. Dry run one small subtree, then execute it.
uv run drive-migrate apply --subtree "2019/Budget"
uv run drive-migrate apply --subtree "2019/Budget" --execute

# 4. Inspect what happened.
uv run drive-migrate report --out migration-report.csv

# 5. When satisfied, the whole tree.
uv run drive-migrate apply                # full dry run
uv run drive-migrate apply --execute
```

`scan` prints a per-owner breakdown, which is usually the first genuinely useful
output: it tells you how much of the folder you actually own and who the other
owners are.

### Useful flags

| Flag | Effect |
|---|---|
| `--subtree "2019/Budget"` | restrict to a relative path under the source root |
| `--limit 20` | process at most N items (pairs well with a dry run) |
| `--max-depth 2` | on `scan`, inventory only the top levels |
| `--no-comments` | skip comment replication (much faster) |
| `--allow-duplicates` | copy even when a same-named file already exists at the destination |
| `--yes` | skip the confirmation prompt (for unattended runs) |
| `-v` | debug logging |

### Resuming and re-running

State lives in `.migrate/state.sqlite`. Completed actions are recorded with the
destination file ID and are never repeated — re-running `apply --execute` after
an interruption picks up where it stopped. Re-running `plan` will not undo
completed work.

Independently of the state file, `apply` checks the destination for a
same-named child before moving or copying, so a lost database cannot produce
duplicates.

The database is plain SQLite; inspect it directly when the CSV isn't enough:

```bash
sqlite3 .migrate/state.sqlite \
  "SELECT i.path, a.action, a.status, a.error FROM actions a
   JOIN items i ON i.id = a.source_id WHERE a.status != 'DONE';"
```

---

## Testing

```bash
uv run pytest          # 17 tests, no network
uv run ruff check .
uv run ty check src
```

`tests/conftest.py` implements `FakeDriveClient`, an in-memory Drive with the
same method surface as the real client, holding a small tree that mirrors a
realistic situation: files you own, files owned by someone who has left, a file
with copying disabled, a Google Map, a shortcut, and comment threads including a
resolved one. The tests cover the classification table, dry-run isolation,
comment replication, idempotent re-runs, and per-item failure isolation.

---

## Why not Apps Script

Apps Script would work, but a consumer Gmail account gets a 6-minute cap per
execution, so hundreds of files means chunking the work across time-driven
triggers with checkpointed state — most of the complexity here, plus the
awkwardness of testing it. A local script has no runtime limit, keeps state in a
file you can query, and runs its whole logic layer offline under pytest.

Google's own tooling doesn't cover this case either: the Drive UI's shared drive
migration only handles content you own, and the Workspace data-transfer tool
only moves between accounts inside one organisation.

## Layout

```
src/drive_migrate/
  auth.py       OAuth installed-app flow
  drive.py      Drive v3 wrapper: retries, paging, field selection
  scan.py       phase 1 — recursive inventory (read-only)
  plan.py       phase 2 — classification, pure logic
  apply.py      phase 3 — executor, dry run by default
  comments.py   comment thread replication
  state.py      SQLite inventory/plan/status
  report.py     CSV manifest and summaries
  cli.py        argparse entry point
```
