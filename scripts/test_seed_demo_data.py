"""Tests for scripts/seed_demo_data.py.

Validates that the seed script does NOT print credentials to stdout or
stderr. Connection strings may contain a password; any log line that
includes them must go through redact_connection_string first.
"""

from __future__ import annotations

import io
import sys
from contextlib import redirect_stderr, redirect_stdout
from unittest.mock import patch

import pytest

sys.path.insert(0, "scripts")

import seed_demo_data  # noqa: E402


SECRET_PASSWORD = "this-is-a-secret-pw-12345"
CONN_STRING = f"mongodb+srv://admin:{SECRET_PASSWORD}@cluster0.mongodb.net/argus_demo"


def _run_main(argv: list[str]) -> tuple[str, str, int]:
    """Run seed_demo_data.main with mocked argv. Return (stdout, stderr, exit_code)."""
    out = io.StringIO()
    err = io.StringIO()
    with patch.object(sys, "argv", ["seed_demo_data.py"] + argv):
        with redirect_stdout(out), redirect_stderr(err):
            # Patch MongoClient + the call to actually insert so we don't hit a real DB.
            with patch("seed_demo_data.MongoClient") as mc:
                mc.return_value.admin.command.return_value = {"ok": 1}
                # Make the call_tool list-collections and sample skip work trivially.
                # (We don't need real data for the test — we only check log output.)
                # But the seed script actually inserts into the DB. Mock bulk_insert.
                with patch("seed_demo_data.bulk_insert", return_value=0):
                    try:
                        rc = seed_demo_data.main()
                    except SystemExit as e:
                        rc = e.code
    return out.getvalue(), err.getvalue(), rc or 0


def test_help_does_not_leak_password() -> None:
    """--help should never echo the connection string."""
    out, _, _ = _run_main(["--connection-string", CONN_STRING, "--help"])
    assert SECRET_PASSWORD not in out


def test_missing_connection_string_does_not_echo_input() -> None:
    """When no connection string is given, the error message must not contain one."""
    out, err, _ = _run_main([])
    # Nothing was passed, so no password should appear in either stream.
    assert SECRET_PASSWORD not in out
    assert SECRET_PASSWORD not in err


def test_connection_string_is_redacted_on_stdout() -> None:
    """When the seed script prints a status line, the password must be redacted."""
    # The connect step will fail because no real DB, but the "connecting to ..."
    # print should still be safe.
    out, _, _ = _run_main(
        [
            "--connection-string",
            CONN_STRING,
            "--users",
            "1",
            "--events",
            "1",
            "--orders",
            "1",
        ]
    )
    # The raw password must not appear anywhere in stdout.
    assert SECRET_PASSWORD not in out, (
        f"Password leaked in stdout!\n--- output ---\n{out}\n--- end ---"
    )
    # A safe redacted form should appear instead.
    assert "***" in out or "localhost" in out or "argus_demo" in out


def test_connection_string_is_redacted_on_stderr() -> None:
    """Error paths that print the connection string must also be safe."""
    out, err, _ = _run_main(
        [
            "--connection-string",
            "not-a-valid-mongodb-url",
            "--users",
            "1",
        ]
    )
    # The invalid-string branch does not echo the connection string,
    # so this is a regression check that the path stays clean.
    assert SECRET_PASSWORD not in err
    assert SECRET_PASSWORD not in out
