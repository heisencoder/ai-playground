from __future__ import annotations

import copy

import pytest

from drive_migrate.apply import Applier
from drive_migrate.comments import render_comment, replicate_comments
from drive_migrate.drive import DriveError
from drive_migrate.plan import build_plan
from drive_migrate.scan import scan
from drive_migrate.state import DONE, PENDING, State
from tests.conftest import FakeDriveClient


def _prepare(fake: FakeDriveClient, state: State, tree: dict[str, str]) -> None:
    scan(fake, state, tree["root"])
    build_plan(state)


def _applier(
    fake: FakeDriveClient, state: State, tree: dict[str, str], **kw: bool
) -> Applier:
    return Applier(
        client=fake,
        state=state,
        source_root_id=tree["root"],
        dest_root_id=tree["drive"],
        dest_drive_id=tree["drive"],
        **kw,
    )


def test_dry_run_changes_nothing(fake: FakeDriveClient, state: State, tree: dict[str, str]) -> None:
    _prepare(fake, state, tree)
    before = copy.deepcopy(fake.files)
    stats = _applier(fake, state, tree, execute=False).run()

    assert stats.folders_created == 2
    assert stats.moved == 1
    assert stats.copied == 1
    assert stats.skipped == 2
    assert fake.files == before
    assert all(r["status"] == PENDING for r in state.planned())


def test_dry_run_counts_comments_without_writing(
    fake: FakeDriveClient, state: State, tree: dict[str, str]
) -> None:
    _prepare(fake, state, tree)
    stats = _applier(fake, state, tree, execute=False).run()
    assert stats.comments_copied == 2  # two source threads, none actually written
    assert len(fake.comments[tree["theirs"]]) == 2


def test_execute_creates_structure_and_moves(
    fake: FakeDriveClient, state: State, tree: dict[str, str]
) -> None:
    _prepare(fake, state, tree)
    stats = _applier(fake, state, tree, execute=True).run()

    assert stats.failed == 0
    dest_children = {f["name"] for f in fake.list_children(tree["drive"])}
    assert "2019" in dest_children
    assert "Link to policy" in dest_children

    y2019 = fake.find_child(tree["drive"], "2019")
    assert y2019 is not None
    budget = fake.find_child(y2019["id"], "Budget")
    assert budget is not None
    names = {f["name"] for f in fake.list_children(budget["id"])}
    assert names == {"My budget notes", "Treasurer report 2019"}

    # The moved file keeps its ID; the copy gets a new one.
    moved = fake.find_child(budget["id"], "My budget notes")
    assert moved is not None
    assert moved["id"] == tree["mine"]
    copied = fake.find_child(budget["id"], "Treasurer report 2019")
    assert copied is not None
    assert copied["id"] != tree["theirs"]
    assert copied["appProperties"]["migrationSourceId"] == tree["theirs"]
    assert "former.treasurer@example.org" in copied["description"]


def test_execute_replicates_comments(
    fake: FakeDriveClient, state: State, tree: dict[str, str]
) -> None:
    _prepare(fake, state, tree)
    _applier(fake, state, tree, execute=True).run()

    y2019 = fake.find_child(tree["drive"], "2019")
    assert y2019 is not None
    budget = fake.find_child(y2019["id"], "Budget")
    assert budget is not None
    copied = fake.find_child(budget["id"], "Treasurer report 2019")
    assert copied is not None

    new_comments = fake.comments[copied["id"]]
    assert len(new_comments) == 2
    first = new_comments[0]["content"]
    assert "Jane" in first
    assert "Line 14 looks off" in first
    assert "> Total: 41,203" in first
    assert len(new_comments[0]["replies"]) == 1
    assert new_comments[1]["resolved"] is True


def test_rerun_is_idempotent(fake: FakeDriveClient, state: State, tree: dict[str, str]) -> None:
    _prepare(fake, state, tree)
    _applier(fake, state, tree, execute=True).run()
    file_count = len(fake.files)

    build_plan(state)  # replanning must not undo completed work
    stats = _applier(fake, state, tree, execute=True).run()
    assert len(fake.files) == file_count
    assert stats.copied == 0
    assert stats.folders_created == 0


def test_subtree_and_limit(fake: FakeDriveClient, state: State, tree: dict[str, str]) -> None:
    _prepare(fake, state, tree)
    stats = _applier(fake, state, tree, execute=False).run(path_prefix="2019/Budget", limit=2)
    assert stats.attempted == 2


def test_failure_is_recorded_and_does_not_abort(
    fake: FakeDriveClient,
    state: State,
    tree: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _prepare(fake, state, tree)

    def boom(*a: object, **k: object) -> dict:
        raise DriveError("storageQuotaExceeded", status=403, reason="storageQuotaExceeded")

    monkeypatch.setattr(fake, "copy_file", boom)
    stats = _applier(fake, state, tree, execute=True).run()
    assert stats.failed == 1
    assert stats.folders_created == 2  # other work still completed
    assert any("storageQuotaExceeded" in e for e in stats.errors)


def test_no_comments_flag(fake: FakeDriveClient, state: State, tree: dict[str, str]) -> None:
    _prepare(fake, state, tree)
    _applier(fake, state, tree, execute=True, copy_comments=False).run()
    y2019 = fake.find_child(tree["drive"], "2019")
    assert y2019 is not None
    budget = fake.find_child(y2019["id"], "Budget")
    assert budget is not None
    copied = fake.find_child(budget["id"], "Treasurer report 2019")
    assert copied is not None
    assert copied["id"] not in fake.comments


def test_render_comment_format() -> None:
    text = render_comment(
        {
            "author": {"displayName": "Jane Doe"},
            "createdTime": "2020-02-03T10:00:00Z",
            "content": "Check this",
            "quotedFileContent": {"value": "line one\nline two"},
        }
    )
    assert text.startswith("[migrated comment] Jane Doe — 2020-02-03")
    assert "> line one\n> line two" in text
    assert text.endswith("Check this")


def test_replicate_comments_survives_unsupported_file(fake: FakeDriveClient) -> None:
    class Broken(FakeDriveClient):
        def list_comments(self, file_id: str) -> list[dict]:
            raise DriveError("comments not supported", status=400)

    broken = Broken()
    result = replicate_comments(broken, "a", "b")
    assert result.total == 0
    assert result.errors


def test_status_recorded_as_done(fake: FakeDriveClient, state: State, tree: dict[str, str]) -> None:
    _prepare(fake, state, tree)
    _applier(fake, state, tree, execute=True).run()
    action = state.action_of(tree["theirs"])
    assert action is not None
    assert action.status == DONE
    assert action.dest_id
