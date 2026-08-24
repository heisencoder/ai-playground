"""CLI parsing and top-level error handling."""

from __future__ import annotations

import argparse
from pathlib import Path

import pytest

from drive_migrate import cli
from drive_migrate.drive import DriveError


def test_shared_option_after_subcommand() -> None:
    args = cli.build_parser().parse_args(
        ["scan", "--source-name", "Source Folder", "--max-depth", "2"]
    )
    assert args.command == "scan"
    assert args.source_name == "Source Folder"
    assert args.max_depth == 2


def test_apply_mixes_shared_and_subcommand_options() -> None:
    args = cli.build_parser().parse_args(
        ["apply", "--subtree", "2019/Budget", "--execute", "--source-id", "abc"]
    )
    assert args.command == "apply"
    assert args.subtree == "2019/Budget"
    assert args.execute is True
    assert args.source_id == "abc"


def test_shared_option_before_subcommand_is_rejected() -> None:
    # Options belong after the subcommand; the reverse order is not accepted.
    with pytest.raises(SystemExit):
        cli.build_parser().parse_args(["--source-name", "X", "scan"])


def test_main_reports_drive_error_without_a_traceback(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    tmp_path: Path,
) -> None:
    def boom(args: argparse.Namespace) -> int:
        raise DriveError("File not found: .", status=404, reason="notFound")

    monkeypatch.setattr(cli, "cmd_scan", boom)
    code = cli.main(["scan", "--db", str(tmp_path / "state.sqlite")])
    assert code == 1
    err = capsys.readouterr().err
    assert "404" in err
    assert "notFound" in err
    assert "Traceback" not in err
