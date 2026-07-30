"""The parser accepts shared options after the subcommand (tool subcommand --flags)."""

from __future__ import annotations

import pytest

from drive_migrate.cli import build_parser


def test_shared_option_after_subcommand() -> None:
    args = build_parser().parse_args(["scan", "--source-name", "Source Folder", "--max-depth", "2"])
    assert args.command == "scan"
    assert args.source_name == "Source Folder"
    assert args.max_depth == 2


def test_apply_mixes_shared_and_subcommand_options() -> None:
    args = build_parser().parse_args(
        ["apply", "--subtree", "2019/Budget", "--execute", "--source-id", "abc"]
    )
    assert args.command == "apply"
    assert args.subtree == "2019/Budget"
    assert args.execute is True
    assert args.source_id == "abc"


def test_shared_option_before_subcommand_is_rejected() -> None:
    # Options belong after the subcommand; the reverse order is not accepted.
    with pytest.raises(SystemExit):
        build_parser().parse_args(["--source-name", "X", "scan"])
