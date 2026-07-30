"""OAuth installed-app flow.

Read-only phases (preflight/scan/plan and any dry-run apply) authenticate with
the read-only https://www.googleapis.com/auth/drive.readonly scope, so they
physically cannot modify Drive. Only apply --execute (and preflight --roundtrip)
request the full https://www.googleapis.com/auth/drive scope. drive.file is not
usable: it only grants access to files this app created, and the migration must
read files created by other people.

The two scopes are cached in separate token files (token.json and
token.readonly.json), so the read-only path never reuses a write-capable token.
"""

from __future__ import annotations

import logging
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


def build_service(
    credentials_path: Path | str = "credentials.json",
    token_path: Path | str = ".migrate/token.json",
    login_hint: str | None = None,
    read_only: bool = False,
) -> DriveService:
    scopes = READONLY_SCOPES if read_only else READWRITE_SCOPES
    credentials_path = Path(credentials_path)
    token_path = Path(token_path)
    if read_only:
        # Cache the limited token separately so it never shadows the write token.
        token_path = token_path.with_name(f"{token_path.stem}.readonly{token_path.suffix}")
    token_path.parent.mkdir(parents=True, exist_ok=True)

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
