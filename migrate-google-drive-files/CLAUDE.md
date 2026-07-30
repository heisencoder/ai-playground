# Claude Code Guidelines for the Drive Migration Tool

Concise guidelines for anyone (human or Claude Code) working on this project.
Follow the [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)
unless a rule below is more specific.

## Setup

The project uses [`uv`](https://docs.astral.sh/uv/). Run all commands from the
project directory (`migrate-google-drive-files/`).

```bash
uv sync            # create the venv and install deps (incl. dev tools)
uv run drive-migrate --help
```

## Quality gate — run before every commit and push

All four must pass. CI (`.github/workflows/migrate-google-drive-files-ci.yml`)
runs exactly these on Python 3.11 and 3.12, so run them locally first.

```bash
uv run pytest                       # tests (offline; no network, no real Drive)
uv run ruff check .                 # lint (strict rule set)
uv run ruff format --check .        # formatting
uv run ty check drive_migrate tests # type checking (Astral's ty)
```

To auto-fix: `uv run ruff format .` and `uv run ruff check --fix .`.

## Coding standards

These are enforced by the tools above; keep them true so CI stays green.

- **Layout.** Package code lives in `drive_migrate/`; tests in `tests/`. There is
  no `src/` directory.
- **Absolute imports only.** Never use relative imports. Import from the package
  root, e.g. `from drive_migrate.comments import replicate_comments`, not
  `from .comments import ...`. This is enforced by ruff
  (`flake8-tidy-imports`, `ban-relative-imports = "all"`) in package and tests.
- **All imports at the top of the file.** Never import inside a function or
  method. Do not use `if TYPE_CHECKING:` import blocks either — keep imports
  unconditional at module top.
- **Never catch broad `Exception`** (or bare `except:`). Catch the specific,
  expected exception types. For example, Drive API failures surface as
  `drive_migrate.drive.DriveError`; catch that, not `Exception`. If you need a
  resilience boundary, name the concrete infrastructure errors you expect
  (`OSError`, `sqlite3.Error`, `GoogleAuthError`, …) and let genuine logic
  errors propagate.
- **Type everything.** Every function and method parameter and return value is
  annotated, in package and tests. Use modern syntax (`str | None`,
  `list[dict]`) with `from __future__ import annotations`.
- **No `typing.Any`.** It is banned by ruff (`flake8-tidy-imports` banned-api),
  so it cannot come back. Use a precise type instead. For an untyped third-party
  surface, name its real class (`googleapiclient`'s `Resource` for the service,
  `HttpRequest` for a request). When the precise type is verbose, define a small
  type alias (as with `state.JsonValue` for the JSON meta store and
  `drive.QueryValue`/`drive.BodyValue` for Drive request payloads).
- **Fix, don't suppress.** Prefer fixing a finding over silencing it. If a rule
  genuinely does not apply, use a narrowly-scoped, commented `# noqa: <CODE>`
  or `# ty: ignore[<code>]` explaining why — never a blanket file-level
  disable. Prefer narrowing (`assert x is not None`) over an ignore.

## Architecture

Four phases, all a dry run until `--execute`:

```
drive_migrate/
  auth.py       OAuth installed-app flow
  drive.py      Drive v3 wrapper: retries, paging, field selection (DriveClient)
  scan.py       phase 1 — recursive inventory (read-only)
  plan.py       phase 2 — classification, pure logic
  apply.py      phase 3 — executor, dry run by default (Applier)
  comments.py   comment thread replication
  state.py      SQLite inventory/plan/status
  report.py     CSV manifest and summaries
  cli.py        argparse entry point
```

`tests/conftest.py` provides `FakeDriveClient`, an in-memory stand-in with the
same method surface as `DriveClient`, so every code path runs offline under
pytest. Keep new Drive interactions behind `DriveClient` so they stay testable.

## Do not commit

Secrets and local state (`credentials.json`, `token*.json`, `.migrate/`,
`*.sqlite`) are git-ignored — keep them that way. Nothing user-specific
(personal emails, org names, drive names) belongs in the code or docs; the tool
is generic and configured entirely via CLI flags.
