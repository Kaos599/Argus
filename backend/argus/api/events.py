"""GET /api/v1/events/stream — SSE for live dashboard updates.

This is listed in the 11-endpoint contract for completeness but is
NOT a v1 requirement (per research/15-routes.md). We implement a
minimal version that emits a keep-alive comment every 15 seconds so
the connection doesn't idle out, plus a "ready" event on connect.

v2 will add per-card updates from the cron tick.

Test hook: ``?max=N`` closes the connection after N events (useful
for unit tests so they don't hang on the infinite stream). Defaults
to 0 = infinite.
"""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from argus.api.dependencies import resolve_session_from_query

router = APIRouter(tags=["events"])


@router.get("/events/stream")
async def events_stream(
    resolved: tuple[str, object] = Depends(resolve_session_from_query),
    max_events: int = Query(
        0,
        ge=0,
        le=10_000,
        description="Optional cap; 0 (default) means infinite. Used by tests.",
    ),
) -> StreamingResponse:
    """Stream live events for the session. v1: keep-alive only.

    The session token is read from the ``?token=`` query parameter.
    """
    token, _session = resolved
    cap = max_events or None

    async def gen() -> AsyncIterator[str]:
        events_sent = 0
        # Emit a "ready" event so the frontend knows the stream is up.
        yield f"event: ready\ndata: {json.dumps({'token': token})}\n\n"
        events_sent += 1
        if cap is not None and events_sent >= cap:
            return
        # Keep-alive comments every 15s.
        try:
            while True:
                await asyncio.sleep(15.0)
                yield ": keep-alive\n\n"
                events_sent += 1
                if cap is not None and events_sent >= cap:
                    return
        except asyncio.CancelledError:
            return

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


__all__ = ["router"]
