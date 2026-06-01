"""GET /api/v1/health — liveness + subprocess stats."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from argus.api.dependencies import get_mcp_manager, get_uptime
from argus.config import settings
from argus.mcp.manager import McpManager
from argus.models.api_types import HealthResponse, HealthStatus, McpSubprocessHealth

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health(
    mcp: McpManager = Depends(get_mcp_manager),
    uptime_s: float = Depends(get_uptime),
) -> HealthResponse:
    """Return liveness + MCP subprocess stats.

    ``status`` is "ok" if we have at least one MCP slot free, "degraded"
    if we're at capacity, and "down" if the manager is uninitialised.
    """
    stats = mcp.stats()
    if stats.active == 0:
        status = HealthStatus.OK
    elif stats.active >= stats.max:
        status = HealthStatus.DEGRADED
    else:
        status = HealthStatus.OK

    return HealthResponse(
        status=status,
        uptime_s=uptime_s,
        version=settings.version,
        mcp_subprocesses=McpSubprocessHealth(active=stats.active, max=stats.max),
    )


__all__ = ["router"]
