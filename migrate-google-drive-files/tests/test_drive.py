"""Tests for the client-side operation allow-list enforced in DriveClient._exec."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from drive_migrate.drive import DisallowedOperationError, DriveClient


def _request(method_id: str | None) -> SimpleNamespace:
    """A stand-in for a googleapiclient HttpRequest (carries methodId + execute)."""
    return SimpleNamespace(methodId=method_id, execute=lambda: {"ok": True})


def _client(read_only: bool) -> DriveClient:
    return DriveClient(service=object(), read_only=read_only)


def test_read_method_allowed_in_readonly() -> None:
    assert _client(read_only=True)._exec(_request("drive.files.list")) == {"ok": True}


def test_read_method_allowed_in_write_mode() -> None:
    assert _client(read_only=False)._exec(_request("drive.files.get")) == {"ok": True}


def test_write_method_blocked_in_readonly() -> None:
    with pytest.raises(DisallowedOperationError):
        _client(read_only=True)._exec(_request("drive.files.create"))


def test_write_method_allowed_in_write_mode() -> None:
    assert _client(read_only=False)._exec(_request("drive.files.copy")) == {"ok": True}


def test_delete_blocked_even_in_write_mode() -> None:
    with pytest.raises(DisallowedOperationError):
        _client(read_only=False)._exec(_request("drive.files.delete"))


def test_empty_trash_blocked_in_write_mode() -> None:
    with pytest.raises(DisallowedOperationError):
        _client(read_only=False)._exec(_request("drive.files.emptyTrash"))


def test_unknown_method_blocked() -> None:
    with pytest.raises(DisallowedOperationError):
        _client(read_only=False)._exec(_request(None))
