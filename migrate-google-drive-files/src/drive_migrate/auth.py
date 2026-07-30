"""OAuth installed-app flow.

Uses the full https://www.googleapis.com/auth/drive scope. Narrower scopes are
not sufficient: drive.file only grants access to files this app created, and the
migration must read files created by dozens of other people.
"""

from __future__ import annotations

import logging
from pathlib import Path

SCOPES = ["https://www.googleapis.com/auth/drive"]

log = logging.getLogger(__name__)


def build_service(
    credentials_path: Path | str = "credentials.json",
    token_path: Path | str = ".migrate/token.json",
    login_hint: str | None = None,
):
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    credentials_path = Path(credentials_path)
    token_path = Path(token_path)
    token_path.parent.mkdir(parents=True, exist_ok=True)

    creds = None
    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as exc:  # noqa: BLE001
                log.warning("token refresh failed (%s); re-authorising", exc)
                creds = None
        if not creds or not creds.valid:
            if not credentials_path.exists():
                raise SystemExit(
                    f"Missing OAuth client file at {credentials_path}. See README step 1."
                )
            flow = InstalledAppFlow.from_client_secrets_file(str(credentials_path), SCOPES)
            kwargs = {"login_hint": login_hint} if login_hint else {}
            creds = flow.run_local_server(port=0, prompt="consent", **kwargs)
        token_path.write_text(creds.to_json())
        token_path.chmod(0o600)

    return build("drive", "v3", credentials=creds, cache_discovery=False)
