"""GET /api/v1/dashboard, PUT /api/v1/dashboard/layout, POST /api/v1/cards."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from argus.api.dependencies import (
    get_mcp_manager,
    get_session_store,
    resolve_session_from_query,
)
from argus.insights.card_renderer import get_module
from argus.mcp.manager import McpManager
from argus.models.api_types import (
    AddCardRequest,
    AddCardResponse,
    CardDescriptor,
    DashboardLayout,
    DashboardResponse,
    ErrorCode,
    ErrorResponse,
    LayoutRequest,
    LayoutResponse,
    ModuleName,
)
from argus.state.session_store import SessionStore

router = APIRouter(tags=["dashboard"])


# ---------------------------------------------------------------------------
# GET /api/v1/dashboard
# ---------------------------------------------------------------------------


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    resolved: tuple[str, object] = Depends(resolve_session_from_query),
    store: SessionStore = Depends(get_session_store),
) -> DashboardResponse:
    """Return the saved dashboard (layout + cards).

    The session token is read from the ``?token=`` query parameter.
    """
    _token, session = resolved
    layout = _to_dashboard_layout(session.layout)
    cards = [CardDescriptor(**c) for c in session.cards if isinstance(c, dict)]
    return DashboardResponse(layout=layout, cards=cards)


# ---------------------------------------------------------------------------
# PUT /api/v1/dashboard/layout
# ---------------------------------------------------------------------------


@router.put("/dashboard/layout", response_model=LayoutResponse)
async def put_dashboard_layout(
    request: LayoutRequest,
    mcp: McpManager = Depends(get_mcp_manager),
    store: SessionStore = Depends(get_session_store),
) -> LayoutResponse:
    """Persist a new layout for the current session.

    The session token is read from the body per the spec.
    """
    token = request.session_token
    try:
        await store.require(token)
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
    await store.update(token, layout=request.layout.model_dump())
    return LayoutResponse(ok=True)


# ---------------------------------------------------------------------------
# POST /api/v1/cards
# ---------------------------------------------------------------------------


@router.post("/cards", response_model=AddCardResponse)
async def add_card(
    request: AddCardRequest,
    mcp: McpManager = Depends(get_mcp_manager),
    store: SessionStore = Depends(get_session_store),
) -> AddCardResponse:
    """Add a single card to the dashboard by running one module.

    The session token is read from the body per the spec.
    """
    token = request.session_token
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

    collection = request.collection or _default_collection_for(request.module)
    params = request.params or {}
    sampled_schema = session.sampled_schema or {}
    module = get_module(request.module)

    try:
        pipeline = module.generate_pipeline(sampled_schema, params)
        result = await mcp.call_tool(
            token,
            "mongodb_aggregate",
            {"collection": collection, "pipeline": pipeline},
        )
        docs = _extract_documents(result)
        descriptor = module.render_card(docs, params)
    except Exception as exc:
        descriptor = CardDescriptor.error(
            f"Failed to add card: {exc}",
            title=f"{request.module.value.title()} failed",
            error_code=ErrorCode.MQL_EXECUTION_FAILED.value,
            is_retryable=True,
        )

    card_id = uuid.uuid4().hex
    cards = list(session.cards) + [descriptor.model_dump(by_alias=True)]
    await store.update(token, cards=cards)

    return AddCardResponse(card_id=card_id, card=descriptor)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _to_dashboard_layout(raw: dict[str, Any]) -> DashboardLayout:
    """Coerce a stored layout dict into a ``DashboardLayout`` model."""
    if not raw:
        return DashboardLayout()
    try:
        return DashboardLayout(**raw)
    except Exception:
        return DashboardLayout()


def _extract_documents(result: dict | list) -> list[dict]:
    if isinstance(result, list):
        return [d for d in result if isinstance(d, dict)]
    if not isinstance(result, dict):
        return []
    for key in ("documents", "cursor", "firstBatch", "result"):
        value = result.get(key)
        if isinstance(value, list):
            return [d for d in value if isinstance(d, dict)]
    return []


def _default_collection_for(module_name: ModuleName) -> str:
    """Return the default collection a module should run against."""
    from argus.insights.card_renderer import get_module as _get

    try:
        return _get(module_name).required_collections[0]
    except (KeyError, IndexError):
        return "events"


__all__ = ["router"]
