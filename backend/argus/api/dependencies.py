"""Shared FastAPI dependencies.

The handler functions in ``argus.api.*`` take a small set of shared
resources (the session store, the MCP manager, the Gemini client) as
FastAPI ``Depends()`` parameters. This module defines the ``get_*``
helpers and wires the singleton instances together.

For tests, the ``reset_singletons`` helper lets a test replace any
singleton with a mock by reassigning the module-level attribute.
"""

from __future__ import annotations

import time

from fastapi import Depends, Header, HTTPException, Path, Query

from argus.llm.gemini_client import GeminiClient, Planner
from argus.mcp.manager import McpManager, SessionStoreConnectionProvider
from argus.state.session_store import Session, SessionStore

# ---------------------------------------------------------------------------
# Singletons — initialised in the FastAPI lifespan
# ---------------------------------------------------------------------------

_session_store: SessionStore | None = None
_mcp_manager: McpManager | None = None
_gemini: GeminiClient | None = None
_planner: Planner | None = None
_startup_time: float | None = None


def init_singletons(force: bool = False) -> None:
    """Wire the singletons. Called from the FastAPI lifespan.

    If any singleton is already set, this is a no-op unless ``force=True``.
    Tests use this to inject mocks before the lifespan runs (or to skip
    the lifespan entirely).
    """
    global _session_store, _mcp_manager, _gemini, _planner, _startup_time

    if not force and any((_session_store, _mcp_manager, _gemini, _planner)):
        return

    _session_store = SessionStore()
    _mcp_manager = McpManager(
        connection_provider=SessionStoreConnectionProvider(_session_store),
    )
    _gemini = GeminiClient()
    _planner = Planner(client=_gemini)
    _startup_time = time.time()


async def start_background_tasks() -> None:
    """Start the MCP reaper. Called from the FastAPI lifespan."""
    if _mcp_manager is not None:
        await _mcp_manager.start()


async def stop_background_tasks() -> None:
    """Stop the MCP reaper and clean up. Called from the FastAPI lifespan."""
    if _mcp_manager is not None:
        await _mcp_manager.stop()


def reset_singletons() -> None:
    """Reset all singletons — used by tests to inject mocks."""
    global _session_store, _mcp_manager, _gemini, _planner, _startup_time
    _session_store = None
    _mcp_manager = None
    _gemini = None
    _planner = None
    _startup_time = None


# ---------------------------------------------------------------------------
# Dependency getters
# ---------------------------------------------------------------------------


def get_session_store() -> SessionStore:
    if _session_store is None:
        raise HTTPException(
            status_code=503,
            detail="Session store not initialized",
        )
    return _session_store


def get_mcp_manager() -> McpManager:
    if _mcp_manager is None:
        raise HTTPException(
            status_code=503,
            detail="MCP manager not initialized",
        )
    return _mcp_manager


def get_gemini_client() -> GeminiClient:
    if _gemini is None:
        raise HTTPException(
            status_code=503,
            detail="Gemini client not initialized",
        )
    return _gemini


def get_planner() -> Planner:
    if _planner is None:
        raise HTTPException(
            status_code=503,
            detail="Planner not initialized",
        )
    return _planner


def get_uptime() -> float:
    if _startup_time is None:
        return 0.0
    return time.time() - _startup_time


# ---------------------------------------------------------------------------
# Session lookup
# ---------------------------------------------------------------------------


async def get_session(
    token: str = Path(..., min_length=1, description="Session token from /connect"),
    store: SessionStore = Depends(get_session_store),
) -> Session:
    """Look up a session by token, raising 404 if missing/expired.

    The ``token`` is pulled from the URL path parameter (the ``{token}``
    placeholder in routes like ``/api/v1/probe/{token}``).
    """
    try:
        session = await store.require(token)
    except KeyError as exc:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "UNKNOWN",
                    "message": "Session not found or expired",
                    "isRetryable": False,
                }
            },
        ) from exc
    return session


async def resolve_session(
    token: str = Path(..., min_length=1, description="Session token"),
    store: SessionStore = Depends(get_session_store),
) -> tuple[str, Session]:
    """Return ``(token, session)`` for endpoints that need both.

    The McpManager is keyed by session token (tenant key). Endpoints
    that route MCP calls need both the token (to look up the
    subprocess) and the session (to read the connection string).
    """
    session = await get_session(token, store)
    return token, session


async def resolve_session_from_query(
    token: str = Query(..., min_length=1, description="Session token (query param)"),
    store: SessionStore = Depends(get_session_store),
) -> tuple[str, Session]:
    """Like ``resolve_session`` but reads the token from the query string.

    Used by ``GET /api/v1/dashboard`` and ``GET /api/v1/events/stream``
    where the token doesn't have a natural path slot.
    """
    session = await get_session(token, store)
    return token, session


async def get_session_via_header(
    x_session_token: str | None = Header(default=None, alias="X-Session-Token"),
    store: SessionStore = Depends(get_session_store),
) -> Session:
    """Read the session token from a header. Reserved for v2."""
    if not x_session_token:
        raise HTTPException(
            status_code=401,
            detail={
                "error": {
                    "code": "UNKNOWN",
                    "message": "Missing X-Session-Token header",
                    "isRetryable": False,
                }
            },
        )
    return await get_session(x_session_token, store)


__all__ = [
    "get_gemini_client",
    "get_mcp_manager",
    "get_planner",
    "get_session",
    "get_session_store",
    "get_session_via_header",
    "get_uptime",
    "init_singletons",
    "reset_singletons",
    "resolve_session",
    "resolve_session_from_query",
    "start_background_tasks",
    "stop_background_tasks",
]
