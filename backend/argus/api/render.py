"""POST /api/v1/render — run a plan and stream CardDescriptors via SSE.

The event types are:

- ``event: progress`` — ``data: {completed, total}``
- ``event: card`` — ``data: CardDescriptor``
- ``event: error`` — ``data: ErrorCardProps``
- ``event: done`` — ``data: {plan_id}``

The frontend opens an ``EventSource`` (or POST + manual SSE parser)
and renders cards as they arrive.
"""

from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from argus.api.dependencies import get_mcp_manager, get_session_store
from argus.guard.result_set_guard import GuardViolation, redact_connection_string
from argus.insights.card_renderer import get_module
from argus.mcp.manager import McpManager
from argus.models.api_types import (
    CardDescriptor,
    ErrorCode,
    ErrorResponse,
    ModuleName,
    RenderProgressData,
    RenderRequest,
)
from argus.state.session_store import SessionStore

logger = logging.getLogger(__name__)


router = APIRouter(tags=["render"])


@router.post("/render")
async def render(
    request: RenderRequest,
    mcp: McpManager = Depends(get_mcp_manager),
    store: SessionStore = Depends(get_session_store),
) -> StreamingResponse:
    """Stream the render of a previously-generated plan.

    The request body is ``{session_token, plan_id}``. We look up the
    plan on the session, then for each plan step:

    1. Validate the pipeline through the result-set guard.
    2. Run it via ``McpManager.call_tool``.
    3. Hand the result to the module's ``render_card``.
    4. Emit ``event: card`` with the resulting descriptor.
    """
    session_token = request.session_token
    plan_id = request.plan_id
    token = session_token

    try:
        session = await store.require(token)
    except KeyError as exc:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(
                error={
                    "code": ErrorCode.UNKNOWN,
                    "message": "Session not found or expired",
                    "isRetryable": False,
                }
            ).model_dump(by_alias=True),
        ) from exc

    plan_steps = session.plans.get(plan_id) or []
    if not plan_steps:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(
                error={
                    "code": ErrorCode.UNKNOWN,
                    "message": "plan not found; call /plan first",
                    "isRetryable": False,
                }
            ).model_dump(by_alias=True),
        )

    return StreamingResponse(
        _event_stream(token, plan_id, plan_steps, mcp),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


async def _event_stream(
    token: str,
    plan_id: str,
    plan_steps: list[dict],
    mcp: McpManager,
) -> AsyncIterator[str]:
    """Yield SSE-formatted event lines for a plan."""
    total = len(plan_steps)
    progress = RenderProgressData(completed=0, total=total)
    yield _format_event("progress", progress.model_dump(by_alias=True))

    completed = 0
    for step in plan_steps:
        module_name_str = step.get("module")
        collection = step.get("collection")
        pipeline = step.get("mql_pipeline") or step.get("mqlPipeline")
        params = step.get("params") or {}

        # Resolve module. If unknown, emit an error card and move on.
        try:
            module_name = ModuleName(module_name_str) if module_name_str else None
        except ValueError:
            module_name = None
        if module_name is None or not collection or not isinstance(pipeline, list):
            yield _format_event(
                "error",
                {
                    "title": "Invalid plan step",
                    "message": f"Step missing module/collection/pipeline: {step}",
                    "isRetryable": False,
                },
            )
            continue

        # Send a progress tick before the call so the UI can show
        # "rendering X of Y".
        yield _format_event("progress", {"completed": completed, "total": total})

        # Run the pipeline through the MCP subprocess. The guard is
        # applied inside McpSubprocess.call_tool.
        try:
            result = await mcp.call_tool(
                token,
                "mongodb_aggregate",
                {
                    "collection": collection,
                    "pipeline": pipeline,
                },
            )
            # The MCP server returns ``{"documents": [...]}`` (or
            # sometimes a bare list). Normalize to a list.
            docs = _extract_documents(result)
        except GuardViolation as exc:
            yield _format_event(
                "error",
                {
                    "title": "Read-only violation",
                    "message": exc.message,
                    "errorCode": exc.code.value,
                    "isReadOnlyViolation": exc.code == ErrorCode.READ_ONLY_VIOLATION,
                    "isRetryable": False,
                },
            )
            completed += 1
            yield _format_event("progress", {"completed": completed, "total": total})
            continue
        except Exception as exc:
            logger.warning(
                "render failed for module=%s collection=%s: %s",
                module_name.value,
                collection,
                redact_connection_string(str(exc))[:500],
            )
            yield _format_event(
                "error",
                {
                    "title": f"{module_name.value.title()} failed",
                    "message": "The MQL pipeline failed to execute against the cluster.",
                    "errorCode": ErrorCode.MQL_EXECUTION_FAILED.value,
                    "isRetryable": True,
                    "guidance": "Check that the collection name and field names match your schema.",
                },
            )
            completed += 1
            yield _format_event("progress", {"completed": completed, "total": total})
            continue

        # Render the card.
        try:
            module = get_module(module_name)
            descriptor = module.render_card(docs, params)
        except Exception as exc:
            logger.exception("render_card failed for module=%s", module_name.value)
            descriptor = CardDescriptor.error(
                f"Card rendering failed: {exc}",
                title=f"{module_name.value.title()} render error",
                is_retryable=True,
            )

        yield _format_event("card", descriptor.model_dump(by_alias=True))
        completed += 1
        yield _format_event("progress", {"completed": completed, "total": total})

    yield _format_event("done", {"plan_id": plan_id})


def _format_event(event: str, data: dict) -> str:
    """Format one SSE event block."""
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


def _extract_documents(result: dict | list) -> list[dict]:
    """Normalize the MCP server's response to a list of dicts."""
    if isinstance(result, list):
        return [d for d in result if isinstance(d, dict)]
    if not isinstance(result, dict):
        return []
    for key in ("documents", "cursor", "firstBatch", "result"):
        value = result.get(key)
        if isinstance(value, list):
            return [d for d in value if isinstance(d, dict)]
    return []


__all__ = ["router"]
