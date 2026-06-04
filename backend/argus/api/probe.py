"""GET /api/v1/probe/{token} — probe the cluster, return collection count + status."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from argus.api.dependencies import get_mcp_manager, get_session_store, resolve_session
from argus.mcp.manager import McpManager
from argus.models.api_types import ProbeResponse, SampleStatus
from argus.state.session_store import SessionStore

router = APIRouter(tags=["probe"])


@router.get("/probe/{token}", response_model=ProbeResponse)
async def probe(
    resolved: tuple[str, object] = Depends(resolve_session),
    mcp: McpManager = Depends(get_mcp_manager),
    store: SessionStore = Depends(get_session_store),
) -> ProbeResponse:
    """Return the cluster's collection count and current sample status.

    v1 implementation: if the mcp_manager has a live subprocess for
    this session, we ask it to list collections. Otherwise we report
    ``sample_status='pending'`` and the caller can poll.
    """
    token, session = resolved

    has_sub = await mcp.has_subprocess(token)
    database = _infer_database(session.connection_string) or ""

    if not has_sub:
        return ProbeResponse(
            collections=0,
            database_name=database,
            mongo_version=None,
            cluster_tier=None,
            sample_status=SampleStatus.PENDING,
        )

    # Subprocess exists. Use it to list collections. Best-effort.
    try:
        result = await mcp.call_tool(
            token,
            "mongodb_list_collections",
            {"database": database or None},
        )
        collections = result.get("collections") or []
        return ProbeResponse(
            collections=len(collections) if isinstance(collections, list) else 0,
            database_name=database,
            mongo_version=None,
            cluster_tier=None,
            sample_status=SampleStatus.SAMPLING,
        )
    except Exception:
        return ProbeResponse(
            collections=0,
            database_name=database,
            mongo_version=None,
            cluster_tier=None,
            sample_status=SampleStatus.ERROR,
        )


def _infer_database(connection_string: str) -> str | None:
    """Extract the database name from a connection string.

    Format: ``mongodb[+srv]://[user[:pass]@]host[:port]/database[?options]``.
    """
    try:
        after_scheme = connection_string.split("://", 1)[1]
    except IndexError:
        return None
    if "@" in after_scheme:
        after_scheme = after_scheme.split("@", 1)[1]
    after_scheme = after_scheme.split("?", 1)[0]
    parts = after_scheme.split("/", 1)
    if len(parts) < 2 or not parts[1]:
        return None
    db = parts[1].strip()
    return db or None


__all__ = ["router"]
