"""GET /api/v1/sample/{token} — sample schemas from the top collections."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from argus.api.dependencies import get_mcp_manager, get_session_store, resolve_session
from argus.mcp.manager import McpManager
from argus.models.api_types import (
    CollectionSample,
    ErrorCode,
    ErrorResponse,
    SampleResponse,
)
from argus.state.session_store import SessionStore

router = APIRouter(tags=["sample"])


@router.get("/sample/{token}", response_model=SampleResponse)
async def sample(
    resolved: tuple[str, object] = Depends(resolve_session),
    mcp: McpManager = Depends(get_mcp_manager),
    store: SessionStore = Depends(get_session_store),
) -> SampleResponse:
    """Return a sample of the top collections (name, doc count, fields).

    v1 implementation: list collections, then for each, ask the MCP
    server for a 100-doc schema sample and pick the top 5 by doc count.
    """
    token, session = resolved
    database = _infer_database(session.connection_string)

    try:
        # Step 1: list collections.
        list_result = await mcp.call_tool(
            token,
            "mongodb_list_collections",
            {"database": database} if database else {},
        )
        colls_raw = list_result.get("collections") or []
        # Each entry is a dict like {"name": "users", "type": "collection"}.
        coll_names: list[str] = []
        for entry in colls_raw:
            if isinstance(entry, dict) and entry.get("name"):
                coll_names.append(str(entry["name"]))
            elif isinstance(entry, str):
                coll_names.append(entry)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=ErrorResponse(
                error={
                    "code": ErrorCode.MCP_SUBPROCESS_FAILED,
                    "message": "Failed to list collections",
                    "technicalDetails": str(exc),
                    "isRetryable": True,
                }
            ).model_dump(by_alias=True),
        ) from exc

    # Step 2: for each collection (top 5 by doc count, but for v1 we
    # just take the first 5), ask the MCP server for a schema sample.
    samples: list[CollectionSample] = []
    for name in coll_names[:5]:
        try:
            schema_result = await mcp.call_tool(
                token,
                "mongodb_collection_schema",
                {"database": database, "collection": name} if database else {"collection": name},
            )
            # The MCP server returns something like {"fields": ["a", "b", ...]}
            # or {"sample_fields": [...]}. Normalize.
            fields = schema_result.get("fields") or schema_result.get("sample_fields") or []
            if not isinstance(fields, list):
                fields = []
            doc_count = schema_result.get("doc_count")
            samples.append(
                CollectionSample(
                    name=name,
                    doc_count=int(doc_count) if isinstance(doc_count, (int, float)) else 0,
                    sample_fields=[str(f) for f in fields[:20]],
                )
            )
        except Exception:
            # Best-effort: skip the failing collection.
            continue

    return SampleResponse(collections=samples)


def _infer_database(connection_string: str) -> str | None:
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
    return parts[1].strip() or None


__all__ = ["router"]
