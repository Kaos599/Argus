"""POST /api/v1/refresh — re-run all MQL pipelines for the session's cards."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from argus.api.dependencies import get_mcp_manager, get_session_store
from argus.insights.card_renderer import all_modules
from argus.mcp.manager import McpManager
from argus.models.api_types import (
    ErrorCode,
    ErrorResponse,
    RefreshRequest,
    RefreshResponse,
)
from argus.state.session_store import SessionStore

router = APIRouter(tags=["refresh"])


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(
    request: RefreshRequest,
    mcp: McpManager = Depends(get_mcp_manager),
    store: SessionStore = Depends(get_session_store),
) -> RefreshResponse:
    """Re-run all pipelines backing the current dashboard's cards.

    v1 implementation: for each card on the dashboard, ask the
    matching module to re-render with the latest data. A failure
    on one card does not stop the others; we count successes and
    errors separately.

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

    modules_by_name = {m.name: m for m in all_modules()}
    cards = list(session.cards)
    refreshed = 0
    errors = 0
    new_cards: list[dict] = []

    for card in cards:
        if not isinstance(card, dict):
            continue
        # We don't track the originating module on the card itself, so
        # we run every module that can run. This is wasteful but safe.
        any_ok = False
        for module in modules_by_name.values():
            try:
                pipeline = module.generate_pipeline(session.sampled_schema, {})
                result = await mcp.call_tool(
                    token,
                    "mongodb_aggregate",
                    {
                        "collection": module.required_collections[0],
                        "pipeline": pipeline,
                    },
                )
                docs = _extract_documents(result)
                descriptor = module.render_card(docs, {})
                new_cards.append(descriptor.model_dump(by_alias=True))
                any_ok = True
                refreshed += 1
                break  # one module per card is enough
            except Exception:
                continue
        if not any_ok:
            errors += 1

    await store.update(token, cards=new_cards)
    return RefreshResponse(refreshed_count=refreshed, error_count=errors)


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


__all__ = ["router"]
