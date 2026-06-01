"""Tests for backend/tests/conftest.py fixture hygiene.

Asserts that dead helper functions are removed and that conftest
imports without any runtime errors. The previous conftest contained a
``make_session_with_schema`` helper that:
- was never called from any test
- used the deprecated ``asyncio.get_event_loop().run_until_complete`` API
- returned ``None`` when a schema was provided (broken)
"""

from __future__ import annotations

import importlib
import sys
from pathlib import Path

import pytest

_TESTS_DIR = str(Path(__file__).resolve().parent)
if _TESTS_DIR not in sys.path:
    sys.path.insert(0, _TESTS_DIR)


def test_conftest_module_imports_cleanly() -> None:
    """Importing conftest must not raise (catches ImportError, NameError, etc.)."""
    conftest = importlib.import_module("conftest")
    assert conftest is not None


def test_dead_make_session_with_schema_is_removed() -> None:
    """The dead helper must not be defined in conftest anymore."""
    conftest = importlib.import_module("conftest")
    assert not hasattr(conftest, "make_session_with_schema"), (
        "make_session_with_schema is dead code — remove it from conftest"
    )


def test_asyncio_module_is_not_imported_by_conftest() -> None:
    """conftest should not need the ``asyncio`` import; remove it once
    the dead helper is gone (avoids stale top-level imports)."""
    conftest = importlib.import_module("conftest")
    assert not hasattr(conftest, "asyncio"), (
        "conftest imports asyncio only for the dead helper — remove the import"
    )
