"""Thin, injectable wrapper around the Google Drive v3 API.

Every network call the migrator makes goes through DriveClient. Tests substitute
a FakeDriveClient with the same method surface, so no code path is untestable.
"""

from __future__ import annotations

import logging
import random
import time
from collections.abc import Iterator
from typing import Any

log = logging.getLogger(__name__)

FOLDER_MIME = "application/vnd.google-apps.folder"
SHORTCUT_MIME = "application/vnd.google-apps.shortcut"

# Google file types that the API refuses to copy, or that copy without their data.
UNCOPYABLE_MIMES = {
    "application/vnd.google-apps.map",
    "application/vnd.google-apps.site",
    "application/vnd.google-apps.fusiontable",
}

FILE_FIELDS = (
    "id,name,mimeType,parents,ownedByMe,owners(emailAddress,displayName),size,"
    "modifiedTime,createdTime,trashed,webViewLink,description,"
    "shortcutDetails(targetId,targetMimeType),"
    "capabilities(canCopy,canMoveItemOutOfDrive,canComment,canAddChildren)"
)

COMMENT_FIELDS = (
    "nextPageToken,comments(id,content,author(displayName,emailAddress),createdTime,"
    "modifiedTime,resolved,deleted,quotedFileContent(value),"
    "replies(id,content,author(displayName,emailAddress),createdTime,action,deleted))"
)

RETRYABLE_STATUSES = {403, 429, 500, 502, 503, 504}
RETRYABLE_403_REASONS = {"rateLimitExceeded", "userRateLimitExceeded", "sharingRateLimitExceeded"}


class DriveError(RuntimeError):
    """Non-retryable Drive API failure, carrying the HTTP status."""

    def __init__(self, message: str, status: int | None = None, reason: str | None = None):
        super().__init__(message)
        self.status = status
        self.reason = reason


def escape_query_value(value: str) -> str:
    return value.replace("\\", "\\\\").replace("'", "\\'")


class DriveClient:
    """Wraps a googleapiclient Drive v3 resource."""

    def __init__(self, service: Any, max_attempts: int = 6, sleep=time.sleep):
        self._svc = service
        self._max_attempts = max_attempts
        self._sleep = sleep
        self.call_count = 0

    # -- transport ---------------------------------------------------------

    def _exec(self, request: Any) -> Any:
        from googleapiclient.errors import HttpError

        last: Exception | None = None
        for attempt in range(self._max_attempts):
            try:
                self.call_count += 1
                return request.execute()
            except HttpError as err:  # pragma: no cover - exercised via fakes
                status = getattr(err.resp, "status", None)
                reason = _http_error_reason(err)
                retryable = status in RETRYABLE_STATUSES and (
                    status != 403 or reason in RETRYABLE_403_REASONS
                )
                if not retryable or attempt == self._max_attempts - 1:
                    raise DriveError(str(err), status=status, reason=reason) from err
                delay = min(2**attempt, 32) + random.uniform(0, 1)
                log.warning("Drive %s (%s); retrying in %.1fs", status, reason, delay)
                self._sleep(delay)
                last = err
        raise DriveError(str(last))  # pragma: no cover

    # -- reads -------------------------------------------------------------

    def about(self) -> dict:
        return self._exec(self._svc.about().get(fields="user(emailAddress,displayName)"))["user"]

    def get_file(self, file_id: str) -> dict:
        return self._exec(
            self._svc.files().get(fileId=file_id, fields=FILE_FIELDS, supportsAllDrives=True)
        )

    def get_drive(self, drive_id: str) -> dict:
        return self._exec(
            self._svc.drives().get(
                driveId=drive_id,
                fields="id,name,capabilities(canAddChildren,canEdit,canManageMembers)",
            )
        )

    def find_drive_by_name(self, name: str) -> dict | None:
        page = None
        while True:
            resp = self._exec(
                self._svc.drives().list(
                    pageSize=100, pageToken=page, fields="nextPageToken,drives(id,name)"
                )
            )
            for d in resp.get("drives", []):
                if d["name"] == name:
                    return d
            page = resp.get("nextPageToken")
            if not page:
                return None

    def find_my_drive_folder(self, name: str) -> list[dict]:
        """All non-trashed folders in My Drive matching an exact name."""
        q = (
            f"name = '{escape_query_value(name)}' and mimeType = '{FOLDER_MIME}' "
            "and trashed = false"
        )
        return list(self._query(q))

    def list_children(self, folder_id: str, drive_id: str | None = None) -> Iterator[dict]:
        q = f"'{folder_id}' in parents and trashed = false"
        yield from self._query(q, drive_id=drive_id)

    def find_child(
        self, parent_id: str, name: str, mime_type: str | None = None, drive_id: str | None = None
    ) -> dict | None:
        q = f"'{parent_id}' in parents and name = '{escape_query_value(name)}' and trashed = false"
        if mime_type:
            q += f" and mimeType = '{mime_type}'"
        for item in self._query(q, drive_id=drive_id):
            return item
        return None

    def _query(self, q: str, drive_id: str | None = None) -> Iterator[dict]:
        page = None
        while True:
            kwargs: dict[str, Any] = {
                "q": q,
                "pageSize": 200,
                "pageToken": page,
                "fields": f"nextPageToken,files({FILE_FIELDS})",
                "supportsAllDrives": True,
                "includeItemsFromAllDrives": True,
                "orderBy": "folder,name",
            }
            if drive_id:
                kwargs["corpora"] = "drive"
                kwargs["driveId"] = drive_id
            resp = self._exec(self._svc.files().list(**kwargs))
            yield from resp.get("files", [])
            page = resp.get("nextPageToken")
            if not page:
                return

    # -- writes ------------------------------------------------------------

    def create_folder(self, name: str, parent_id: str) -> dict:
        body = {"name": name, "mimeType": FOLDER_MIME, "parents": [parent_id]}
        return self._exec(
            self._svc.files().create(body=body, fields=FILE_FIELDS, supportsAllDrives=True)
        )

    def copy_file(
        self,
        file_id: str,
        name: str,
        parent_id: str,
        description: str | None = None,
        app_properties: dict[str, str] | None = None,
    ) -> dict:
        body: dict[str, Any] = {"name": name, "parents": [parent_id]}
        if description:
            body["description"] = description
        if app_properties:
            body["appProperties"] = app_properties
        return self._exec(
            self._svc.files().copy(
                fileId=file_id, body=body, fields=FILE_FIELDS, supportsAllDrives=True
            )
        )

    def move_file(self, file_id: str, add_parent: str, remove_parent: str) -> dict:
        return self._exec(
            self._svc.files().update(
                fileId=file_id,
                addParents=add_parent,
                removeParents=remove_parent,
                fields=FILE_FIELDS,
                supportsAllDrives=True,
            )
        )

    def create_shortcut(self, name: str, parent_id: str, target_id: str) -> dict:
        body = {
            "name": name,
            "mimeType": SHORTCUT_MIME,
            "parents": [parent_id],
            "shortcutDetails": {"targetId": target_id},
        }
        return self._exec(
            self._svc.files().create(body=body, fields=FILE_FIELDS, supportsAllDrives=True)
        )

    # -- comments ----------------------------------------------------------

    def list_comments(self, file_id: str) -> list[dict]:
        out: list[dict] = []
        page = None
        while True:
            resp = self._exec(
                self._svc.comments().list(
                    fileId=file_id,
                    pageSize=100,
                    pageToken=page,
                    includeDeleted=False,
                    fields=COMMENT_FIELDS,
                )
            )
            out.extend(resp.get("comments", []))
            page = resp.get("nextPageToken")
            if not page:
                return out

    def create_comment(self, file_id: str, content: str) -> dict:
        return self._exec(
            self._svc.comments().create(fileId=file_id, body={"content": content}, fields="id")
        )

    def create_reply(
        self, file_id: str, comment_id: str, content: str, action: str | None = None
    ) -> dict:
        body: dict[str, Any] = {"content": content}
        if action:
            body["action"] = action
        return self._exec(
            self._svc.replies().create(fileId=file_id, commentId=comment_id, body=body, fields="id")
        )


def _http_error_reason(err: Any) -> str | None:
    try:
        details = err.error_details
        if isinstance(details, list) and details:
            return details[0].get("reason")
    except Exception:  # noqa: BLE001
        pass
    return None
