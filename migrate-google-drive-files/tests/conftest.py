"""An in-memory Drive substitute so every code path can be tested offline."""

from __future__ import annotations

import itertools

import pytest

from drive_migrate.drive import FOLDER_MIME, SHORTCUT_MIME, DriveError
from drive_migrate.state import State

ME = "test.user@example.com"


class FakeDriveClient:
    """Implements the DriveClient method surface against dicts."""

    def __init__(self, me: str = ME):
        self.me = me
        self.files: dict[str, dict] = {}
        self.comments: dict[str, list[dict]] = {}
        self._ids = itertools.count(1)
        self.call_count = 0
        self.drives: dict[str, dict] = {}

    # -- fixture construction ---------------------------------------------

    def _new_id(self, prefix="f") -> str:
        return f"{prefix}{next(self._ids)}"

    def add(
        self,
        name: str,
        parent: str | None,
        mime: str = "application/vnd.google-apps.document",
        owner: str = ME,
        can_copy: bool = True,
        can_move_out: bool | None = None,
        file_id: str | None = None,
        target: str | None = None,
    ) -> str:
        fid = file_id or self._new_id()
        owned = owner == self.me
        self.files[fid] = {
            "id": fid,
            "name": name,
            "mimeType": mime,
            "parents": [parent] if parent else [],
            "ownedByMe": owned,
            "owners": [{"emailAddress": owner, "displayName": owner.split("@")[0]}],
            "size": "1024" if mime != FOLDER_MIME else None,
            "createdTime": "2019-04-01T00:00:00Z",
            "modifiedTime": "2021-06-01T00:00:00Z",
            "trashed": False,
            "webViewLink": f"https://drive.google.com/file/d/{fid}",
            "capabilities": {
                "canCopy": can_copy,
                "canMoveItemOutOfDrive": owned if can_move_out is None else can_move_out,
                "canComment": True,
                "canAddChildren": True,
            },
        }
        if target:
            self.files[fid]["shortcutDetails"] = {"targetId": target}
        return fid

    def add_folder(self, name: str, parent: str | None, **kw) -> str:
        return self.add(name, parent, mime=FOLDER_MIME, **kw)

    def add_shared_drive(self, name: str, can_add: bool = True) -> str:
        did = self._new_id("drive")
        self.drives[did] = {
            "id": did,
            "name": name,
            "capabilities": {
                "canAddChildren": can_add,
                "canEdit": can_add,
                "canManageMembers": False,
            },
        }
        self.files[did] = {
            "id": did,
            "name": name,
            "mimeType": FOLDER_MIME,
            "parents": [],
            "ownedByMe": False,
            "owners": [{"emailAddress": "drive", "displayName": name}],
            "capabilities": {
                "canCopy": False,
                "canMoveItemOutOfDrive": False,
                "canAddChildren": can_add,
            },
            "trashed": False,
        }
        return did

    def add_comment(
        self,
        file_id: str,
        author: str,
        content: str,
        replies=(),
        resolved=False,
        quoted: str | None = None,
    ) -> None:
        self.comments.setdefault(file_id, []).append(
            {
                "id": self._new_id("c"),
                "content": content,
                "author": {"displayName": author, "emailAddress": f"{author}@example.org"},
                "createdTime": "2020-02-03T10:00:00Z",
                "resolved": resolved,
                "deleted": False,
                "quotedFileContent": {"value": quoted} if quoted else None,
                "replies": [
                    {
                        "id": self._new_id("r"),
                        "content": r,
                        "author": {"displayName": author},
                        "createdTime": "2020-02-04T10:00:00Z",
                        "deleted": False,
                    }
                    for r in replies
                ],
            }
        )

    # -- DriveClient surface ----------------------------------------------

    def about(self):
        self.call_count += 1
        return {"emailAddress": self.me, "displayName": "Test User"}

    def get_file(self, file_id):
        self.call_count += 1
        if file_id not in self.files:
            raise DriveError("not found", status=404)
        return self.files[file_id]

    def get_drive(self, drive_id):
        return self.drives[drive_id]

    def find_drive_by_name(self, name):
        return next((d for d in self.drives.values() if d["name"] == name), None)

    def find_my_drive_folder(self, name):
        return [
            f
            for f in self.files.values()
            if f["name"] == name and f["mimeType"] == FOLDER_MIME and not f["trashed"]
        ]

    def list_children(self, folder_id, drive_id=None):
        self.call_count += 1
        kids = [
            f for f in self.files.values() if folder_id in f.get("parents", []) and not f["trashed"]
        ]
        return sorted(kids, key=lambda f: (f["mimeType"] != FOLDER_MIME, f["name"]))

    def find_child(self, parent_id, name, mime_type=None, drive_id=None):
        for f in self.list_children(parent_id):
            if f["name"] == name and (mime_type is None or f["mimeType"] == mime_type):
                return f
        return None

    def create_folder(self, name, parent_id):
        self.call_count += 1
        return self.files[self.add_folder(name, parent_id)]

    def copy_file(self, file_id, name, parent_id, description=None, app_properties=None):
        self.call_count += 1
        src = self.files[file_id]
        if not src["capabilities"]["canCopy"]:
            raise DriveError("cannotCopyFile", status=403, reason="cannotCopyFile")
        new_id = self.add(name, parent_id, mime=src["mimeType"], owner=self.me)
        self.files[new_id]["description"] = description
        self.files[new_id]["appProperties"] = app_properties or {}
        return self.files[new_id]

    def move_file(self, file_id, add_parent, remove_parent):
        self.call_count += 1
        f = self.files[file_id]
        if not f["capabilities"]["canMoveItemOutOfDrive"]:
            raise DriveError(
                "cannotMoveItemOutOfDrive", status=403, reason="cannotMoveItemOutOfDrive"
            )
        f["parents"] = [p for p in f["parents"] if p != remove_parent] + [add_parent]
        return f

    def create_shortcut(self, name, parent_id, target_id):
        self.call_count += 1
        return self.files[self.add(name, parent_id, mime=SHORTCUT_MIME, target=target_id)]

    def list_comments(self, file_id):
        self.call_count += 1
        return [dict(c) for c in self.comments.get(file_id, [])]

    def create_comment(self, file_id, content):
        self.call_count += 1
        cid = self._new_id("nc")
        self.comments.setdefault(file_id, []).append(
            {"id": cid, "content": content, "replies": [], "resolved": False, "deleted": False}
        )
        return {"id": cid}

    def create_reply(self, file_id, comment_id, content, action=None):
        self.call_count += 1
        for c in self.comments.get(file_id, []):
            if c["id"] == comment_id:
                c["replies"].append(
                    {"id": self._new_id("nr"), "content": content, "action": action}
                )
                if action == "resolve":
                    c["resolved"] = True
                return {"id": c["replies"][-1]["id"]}
        raise DriveError("comment not found", status=404)


@pytest.fixture
def state(tmp_path) -> State:
    s = State(tmp_path / "state.sqlite")
    yield s
    s.close()


@pytest.fixture
def fake() -> FakeDriveClient:
    return FakeDriveClient()


@pytest.fixture
def tree(fake: FakeDriveClient):
    """A miniature source tree with a realistic mix of ownership."""
    root = fake.add_folder("Old Finance Archive", None)
    y2019 = fake.add_folder("2019", root)
    budget = fake.add_folder("Budget", y2019)

    mine = fake.add("My budget notes", budget)
    theirs = fake.add("Treasurer report 2019", budget, owner="former.treasurer@example.org")
    locked = fake.add("Sealed audit", budget, owner="auditor@example.org", can_copy=False)
    fake.add(
        "Pledge map", y2019, mime="application/vnd.google-apps.map", owner="someone@example.org"
    )
    fake.add("Link to policy", root, mime=SHORTCUT_MIME, target=mine)

    fake.add_comment(theirs, "Jane", "Line 14 looks off", replies=["Fixed"], quoted="Total: 41,203")
    fake.add_comment(theirs, "Bob", "Approved", resolved=True)

    drive_id = fake.add_shared_drive("Finance Shared Drive")
    return {
        "root": root,
        "y2019": y2019,
        "budget": budget,
        "mine": mine,
        "theirs": theirs,
        "locked": locked,
        "drive": drive_id,
    }
