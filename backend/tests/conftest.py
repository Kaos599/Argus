"""Shared test fixtures: in-memory session store, mock mcp_manager, mock Gemini client."""

from __future__ import annotations

import asyncio
from typing import Any

import pytest
import pytest_asyncio

from argus.api import dependencies as deps
from argus.state.session_store import SessionStore

# ---------------------------------------------------------------------------
# Mock McpManager — records call_tool invocations and returns canned results.
# ---------------------------------------------------------------------------


class MockMcpManager:
    """Drop-in for ``McpManager`` that records calls and returns canned results."""

    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []
        self.results: dict[str, Any] = {}
        self.subprocesses: dict[str, bool] = {}
        self._max = 10

    def set_result(self, tool_name: str, result: Any) -> None:
        self.results[tool_name] = result

    async def call_tool(
        self,
        tenant_id: str,
        tool_name: str,
        args: dict,
        *,
        timeout_s: float | None = None,
    ) -> dict:
        self.calls.append({"tenant_id": tenant_id, "tool_name": tool_name, "args": args})
        if tool_name in self.results:
            return self.results[tool_name]
        # Default: return an empty list wrapped in {"documents": []}
        return {"documents": []}

    async def has_subprocess(self, tenant_id: str) -> bool:
        return self.subprocesses.get(tenant_id, False)

    def stats(self) -> Any:
        # Return an object with .active and .max
        from types import SimpleNamespace

        active = sum(1 for alive in self.subprocesses.values() if alive)
        return SimpleNamespace(active=active, max=self._max)

    def uptime_s(self) -> float:
        return 0.0

    async def start(self) -> None:
        pass

    async def stop(self) -> None:
        pass

    def touch_subprocess(self, tenant_id: str) -> None:
        self.subprocesses[tenant_id] = True


# ---------------------------------------------------------------------------
# Mock Gemini client — returns a canned planner response.
# ---------------------------------------------------------------------------


class MockGeminiClient:
    def __init__(self, planner_response: list[dict] | None = None) -> None:
        self._planner_response = planner_response or []

    async def generate(self, prompt: str, *, system: str | None = None, **kwargs: Any) -> str:
        import json

        return json.dumps({"modules": self._planner_response})


class MockPlanner:
    def __init__(self, plan_response: list[dict] | None = None) -> None:
        self._plan = plan_response or []
        self.last_schema: dict | None = None

    async def plan(self, sampled_schema: dict) -> list[dict]:
        self.last_schema = sampled_schema
        return self._plan


# ---------------------------------------------------------------------------
# Fixture: in-memory store + mock manager, registered as FastAPI deps
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def in_memory_session_store() -> SessionStore:
    return SessionStore()


@pytest_asyncio.fixture
async def mock_mcp() -> MockMcpManager:
    return MockMcpManager()


@pytest_asyncio.fixture
async def mock_planner() -> MockPlanner:
    return MockPlanner()


@pytest_asyncio.fixture
async def wired_app(
    in_memory_session_store: SessionStore,
    mock_mcp: MockMcpManager,
    mock_planner: MockPlanner,
):
    """Wire the singletons to in-memory mocks and yield."""
    deps.reset_singletons()
    # Monkey-patch the singletons directly. We replace them in
    # ``deps._*`` so the dependency getters return our mocks.
    deps._session_store = in_memory_session_store
    deps._mcp_manager = mock_mcp
    deps._gemini = MockGeminiClient()
    deps._planner = mock_planner
    deps._startup_time = 0.0
    yield
    deps.reset_singletons()


@pytest.fixture
def client(wired_app):
    """A FastAPI TestClient wired to the mock singletons."""
    from fastapi.testclient import TestClient

    from argus.main import app

    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_session_with_schema(store: SessionStore, *, schema: dict | None = None) -> str:
    """Create a session with a sampled schema. Returns the token."""

    return (
        asyncio.get_event_loop().run_until_complete(
            store.create("mongodb://test:test@localhost:27017/test")
        )
        if not schema
        else None
    )
