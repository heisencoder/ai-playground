from __future__ import annotations

import copy

from drive_migrate.apply import Applier
from drive_migrate.comments import render_comment, replicate_comments
from drive_migrate.drive import DriveError
from drive_migrate.plan import build_plan
from drive_migrate.scan import scan
from drive_migrate.state import DONE, PENDING


def _prepare(fake, state, tree):
    scan(fake, state, tree["root"])
    build_plan(state)


def _applier(fake, state, tree, **kw):
    return Applier(
        client=fake,
        state=state,
        source_root_id=tree["root"],
        dest_root_id=tree["drive"],
        dest_drive_id=tree["drive"],
        **kw,
    )


def test_dry_run_changes_nothing(fake, state, tree):
    _prepare(fake, state, tree)
    before = copy.deepcopy(fake.files)
    stats = _applier(fake, state, tree, execute=False).run()

    assert stats.folders_created == 2
    assert stats.moved == 1
    assert stats.copied == 1
    assert stats.skipped == 2
    assert fake.files == before
    assert all(r["status"] == PENDING for r in state.planned())


def test_dry_run_counts_comments_without_writing(fake, state, tree):
    _prepare(fake, state, tree)
    stats = _applier(fake, state, tree, execute=False).run()
    assert stats.comments_copied == 2  # two source threads, none actually written
    assert len(fake.comments[tree["theirs"]]) == 2


def test_execute_creates_structure_and_moves(fake, state, tree):
    _prepare(fake, state, tree)
    stats = _applier(fake, state, tree, execute=True).run()

    assert stats.failed == 0
    dest_children = {f["name"] for f in fake.list_children(tree["drive"])}
    assert "2019" in dest_children and "Link to policy" in dest_children

    y2019 = fake.find_child(tree["drive"], "2019")
    budget = fake.find_child(y2019["id"], "Budget")
    names = {f["name"] for f in fake.list_children(budget["id"])}
    assert names == {"My budget notes", "Treasurer report 2019"}

    # The moved file keeps its ID; the copy gets a new one.
    moved = fake.find_child(budget["id"], "My budget notes")
    assert moved["id"] == tree["mine"]
    copied = fake.find_child(budget["id"], "Treasurer report 2019")
    assert copied["id"] != tree["theirs"]
    assert copied["appProperties"]["migrationSourceId"] == tree["theirs"]
    assert "former.treasurer@example.org" in copied["description"]


def test_execute_replicates_comments(fake, state, tree):
    _prepare(fake, state, tree)
    _applier(fake, state, tree, execute=True).run()

    y2019 = fake.find_child(tree["drive"], "2019")
    budget = fake.find_child(y2019["id"], "Budget")
    copied = fake.find_child(budget["id"], "Treasurer report 2019")

    new_comments = fake.comments[copied["id"]]
    assert len(new_comments) == 2
    first = new_comments[0]["content"]
    assert "Jane" in first and "Line 14 looks off" in first and "> Total: 41,203" in first
    assert len(new_comments[0]["replies"]) == 1
    assert new_comments[1]["resolved"] is True


def test_rerun_is_idempotent(fake, state, tree):
    _prepare(fake, state, tree)
    _applier(fake, state, tree, execute=True).run()
    file_count = len(fake.files)

    build_plan(state)  # replanning must not undo completed work
    stats = _applier(fake, state, tree, execute=True).run()
    assert len(fake.files) == file_count
    assert stats.copied == 0 and stats.folders_created == 0


def test_subtree_and_limit(fake, state, tree):
    _prepare(fake, state, tree)
    stats = _applier(fake, state, tree, execute=False).run(path_prefix="2019/Budget", limit=2)
    assert stats.attempted == 2


def test_failure_is_recorded_and_does_not_abort(fake, state, tree, monkeypatch):
    _prepare(fake, state, tree)

    def boom(*a, **k):
        raise DriveError("storageQuotaExceeded", status=403, reason="storageQuotaExceeded")

    monkeypatch.setattr(fake, "copy_file", boom)
    stats = _applier(fake, state, tree, execute=True).run()
    assert stats.failed == 1
    assert stats.folders_created == 2  # other work still completed
    assert any("storageQuotaExceeded" in e for e in stats.errors)


def test_no_comments_flag(fake, state, tree):
    _prepare(fake, state, tree)
    _applier(fake, state, tree, execute=True, copy_comments=False).run()
    y2019 = fake.find_child(tree["drive"], "2019")
    budget = fake.find_child(y2019["id"], "Budget")
    copied = fake.find_child(budget["id"], "Treasurer report 2019")
    assert copied["id"] not in fake.comments


def test_render_comment_format():
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


def test_replicate_comments_survives_unsupported_file(fake):
    class Broken(type(fake)):
        def list_comments(self, file_id):
            raise RuntimeError("comments not supported")

    broken = Broken()
    result = replicate_comments(broken, "a", "b")
    assert result.total == 0 and result.errors


def test_status_recorded_as_done(fake, state, tree):
    _prepare(fake, state, tree)
    _applier(fake, state, tree, execute=True).run()
    action = state.action_of(tree["theirs"])
    assert action.status == DONE and action.dest_id
