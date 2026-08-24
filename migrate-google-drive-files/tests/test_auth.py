"""OAuth secrets must stay out of the git working tree and be locked to the owner."""

from __future__ import annotations

import stat
import tempfile
from pathlib import Path

from drive_migrate.auth import (
    _ensure_private_dir,
    default_credentials_path,
    default_token_path,
)


def test_token_default_is_in_the_temp_dir_not_the_repo() -> None:
    token = default_token_path().resolve()
    assert Path(tempfile.gettempdir()).resolve() in token.parents
    assert Path.cwd().resolve() not in token.parents


def test_credentials_default_is_outside_the_repo() -> None:
    creds = default_credentials_path().resolve()
    assert Path.cwd().resolve() not in creds.parents


def test_ensure_private_dir_creates_a_locked_directory(tmp_path: Path) -> None:
    target = tmp_path / "tokens"
    _ensure_private_dir(target)
    assert target.is_dir()
    assert stat.S_IMODE(target.stat().st_mode) == 0o700


def test_ensure_private_dir_tightens_a_loose_directory(tmp_path: Path) -> None:
    target = tmp_path / "loose"
    target.mkdir(mode=0o755)
    _ensure_private_dir(target)
    assert stat.S_IMODE(target.stat().st_mode) == 0o700
