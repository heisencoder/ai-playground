"""OAuth installed-app flow.

Read-only phases (preflight/scan/plan and any dry-run apply) authenticate with
the read-only https://www.googleapis.com/auth/drive.readonly scope, so they
physically cannot modify Drive. Only apply --execute (and preflight --roundtrip)
request the full https://www.googleapis.com/auth/drive scope. drive.file is not
usable: it only grants access to files this app created, and the migration must
read files created by other people.

The two scopes are cached in separate token files (token.json and
token.readonly.json), so the read-only path never reuses a write-capable token.

Neither secret is stored in the git working tree, so tools operating on the
repository cannot read or leak them. By default the OAuth client secrets live in
the user config directory (see default_credentials_path) and the short-lived
tokens live in a private per-user directory in the system temp location (see
default_token_path); both are locked to the owner.
"""

from __future__ import annotations

import logging
import os
import tempfile
from pathlib import Path
from typing import cast

from google.auth.exceptions import GoogleAuthError
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

from drive_migrate.drive import DriveService

READWRITE_SCOPES = ["https://www.googleapis.com/auth/drive"]
READONLY_SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]

log = logging.getLogger(__name__)


def default_credentials_path() -> Path:
    """Default OAuth client-secrets location, in the user config dir (not the repo)."""
    config_home = os.environ.get("XDG_CONFIG_HOME") or str(Path.home() / ".config")
    return Path(config_home) / "drive-migrate" / "credentials.json"


def default_token_path() -> Path:
    """Default OAuth token location: a private per-user file in the system temp dir.

    Deliberately outside the git working tree so tools operating on the repository
    cannot read or leak the token. Tokens are short-lived and refreshable, so a
    temp-dir location (which may be cleared on reboot, forcing a harmless re-auth)
    is appropriate.
    """
    base = Path(tempfile.gettempdir())
    suffix = f"-{os.getuid()}" if hasattr(os, "getuid") else ""
    return base / f"drive-migrate{suffix}" / "token.json"


def _ensure_private_dir(path: Path) -> None:
    """Create `path` if needed and lock it to the owner (mode 0700).

    OAuth tokens are secrets, so their directory must not be readable by other
    users. The mode is enforced even when the directory already exists, so a token
    written into a pre-existing, loosely-permissioned directory is still private.
    """
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    try:
        path.chmod(0o700)
    except OSError as exc:  # e.g. the directory is owned by another user
        raise SystemExit(f"Cannot secure token directory {path}: {exc}") from exc


def build_service(
    credentials_path: Path | str | None = None,
    token_path: Path | str | None = None,
    login_hint: str | None = None,
    read_only: bool = False,
) -> DriveService:
    scopes = READONLY_SCOPES if read_only else READWRITE_SCOPES
    credentials_path = Path(credentials_path) if credentials_path else default_credentials_path()
    token_path = Path(token_path) if token_path else default_token_path()
    if read_only:
        # Cache the limited token separately so it never shadows the write token.
        token_path = token_path.with_name(f"{token_path.stem}.readonly{token_path.suffix}")
    _ensure_private_dir(token_path.parent)

    creds = None
    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), scopes)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except GoogleAuthError as exc:
                log.warning("token refresh failed (%s); re-authorising", exc)
                creds = None
        if not creds or not creds.valid:
            if not credentials_path.exists():
                raise SystemExit(
                    f"Missing OAuth client file at {credentials_path}. See README step 1."
                )
            flow = InstalledAppFlow.from_client_secrets_file(str(credentials_path), scopes)
            kwargs = {"login_hint": login_hint} if login_hint else {}
            creds = flow.run_local_server(port=0, prompt="consent", **kwargs)
        token_path.write_text(creds.to_json())
        token_path.chmod(0o600)

    log.info("authorised as %s (%s)", token_path.name, "read-only" if read_only else "read/write")
    # googleapiclient's dynamically-built resource is the one untyped boundary; the
    # cast confines it here so the rest of the codebase stays fully typed.
    return cast("DriveService", build("drive", "v3", credentials=creds, cache_discovery=False))
