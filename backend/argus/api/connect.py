"""POST /api/v1/connect — issue a session token, store the connection string.

This endpoint does not spawn the mongodb-mcp-server subprocess. The
subprocess is lazy: it's spawned on the first tool call after the
session is created. The session token is the tenant key for the
``McpManager``.
"""

from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException

from argus.api.dependencies import get_session_store
from argus.models.api_types import (
    ConnectRequest,
    ConnectResponse,
    ConnectStatus,
    ErrorCardProps,
    ErrorCode,
)
from argus.state.session_store import SessionStore

router = APIRouter(tags=["connect"])


# Match ``mongodb://`` and ``mongodb+srv://`` (case-insensitive).
_CONNECTION_STRING_RE = re.compile(
    r"^mongodb(\+srv)?://[^\s]+$",
    flags=re.IGNORECASE,
)


def _validate_connection_string(s: str) -> str | None:
    """Return a redacted version of the connection string if valid.

    Returns ``None`` if invalid. We redact the password before
    returning so the caller never logs the full secret.
    """
    if not isinstance(s, str):
        return None
    s = s.strip()
    if not s:
        return None
    if not _CONNECTION_STRING_RE.match(s):
        return None
    return s


@router.post("/connect", response_model=ConnectResponse)
async def connect(
    request: ConnectRequest,
    store: SessionStore = Depends(get_session_store),
) -> ConnectResponse:
    """Validate a connection string, issue a session token."""
    conn = _validate_connection_string(request.connection_string)
    if conn is None:
        error = ErrorCardProps(
            title="Invalid connection string",
            message="The connection string must start with mongodb:// or mongodb+srv://",
            error_code=ErrorCode.INVALID_INPUT.value,
            is_retryable=True,
            is_read_only_violation=False,
            guidance="Example: mongodb+srv://user:pass@cluster.mongodb.net/dbname",
        )
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": ErrorCode.INVALID_INPUT,
                    "message": "Invalid connection string",
                    "isRetryable": True,
                }
            },
        )

    token = await store.create(conn)
    return ConnectResponse(
        session_token=token,
        status=ConnectStatus.PROBING,
    )


__all__ = ["router"]
