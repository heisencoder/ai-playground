from __future__ import annotations

from drive_migrate.plan import build_plan, classify
from drive_migrate.scan import scan
from drive_migrate.state import COPY, CREATE_FOLDER, MOVE, SHORTCUT, SKIP, State
from tests.conftest import FakeDriveClient


def test_scan_records_paths_and_depths(
    fake: FakeDriveClient, state: State, tree: dict[str, str]
) -> None:
    n = scan(fake, state, tree["root"])
    paths = {i.path: i for i in state.iter_items()}
    assert n == len(paths)
    assert "2019" in paths
    assert "2019/Budget" in paths
    assert paths["2019/Budget"].depth == 2
    assert paths["2019/Budget/My budget notes"].owned_by_me is True
    assert paths["2019/Budget/Treasurer report 2019"].owner_email == "former.treasurer@example.org"


def test_scan_is_idempotent(fake: FakeDriveClient, state: State, tree: dict[str, str]) -> None:
    first = scan(fake, state, tree["root"])
    second = scan(fake, state, tree["root"])
    assert first == second == state.count_items()


def test_subtree_filter(fake: FakeDriveClient, state: State, tree: dict[str, str]) -> None:
    scan(fake, state, tree["root"])
    subset = state.iter_items("2019/Budget")
    assert {i.name for i in subset} == {
        "Budget",
        "My budget notes",
        "Treasurer report 2019",
        "Sealed audit",
    }


def test_classification(fake: FakeDriveClient, state: State, tree: dict[str, str]) -> None:
    scan(fake, state, tree["root"])
    by_path = {i.path: i for i in state.iter_items()}
    assert classify(by_path["2019"])[0] == CREATE_FOLDER
    assert classify(by_path["2019/Budget/My budget notes"])[0] == MOVE
    assert classify(by_path["2019/Budget/Treasurer report 2019"])[0] == COPY
    assert classify(by_path["2019/Budget/Sealed audit"])[0] == SKIP
    assert classify(by_path["2019/Pledge map"])[0] == SKIP
    assert classify(by_path["Link to policy"])[0] == SHORTCUT


def test_owned_but_unmovable_falls_back_to_copy(fake: FakeDriveClient, state: State) -> None:
    root = fake.add_folder("root", None)
    fake.add("Stuck", root, can_move_out=False)
    scan(fake, state, root)
    item = next(i for i in state.iter_items() if i.name == "Stuck")
    action, reason = classify(item)
    assert action == COPY
    assert "canMoveItemOutOfDrive" in reason


def test_build_plan_counts(fake: FakeDriveClient, state: State, tree: dict[str, str]) -> None:
    scan(fake, state, tree["root"])
    counts = build_plan(state)
    assert counts[CREATE_FOLDER] == 2
    assert counts[MOVE] == 1
    assert counts[COPY] == 1
    assert counts[SKIP] == 2
    assert counts[SHORTCUT] == 1
