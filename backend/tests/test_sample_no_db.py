"""Tests for argus.api.sample — empty database path handling.

Covers the case where the connection string has no /<dbname> suffix.
The MCP server should be called without a "database" key, not with an
empty string.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from argus.api import dependencies as _deps


def _deps_mcp():
    return _deps._mcp_manager


def _connect(client: TestClient, conn: str) -> str:
    r = client.post("/api/v1/connect", json={"connection_string": conn})
    assert r.status_code == 200, r.text
    return r.json()["session_token"]


def test_no_db_in_connection_string_passes_no_database_key(client) -> None:
    """When the URL has no /<dbname> suffix, mongodb_list_collections
    must be called with an empty args dict, not with database=""."""
    token = _connect(client, "mongodb://u:p@host:27017")
    mcp = _deps_mcp()
    assert mcp is not None
    mcp.subprocesses[token] = True
    mcp.set_result("mongodb_list_collections", {"collections": []})

    resp = client.get(f"/api/v1/sample/{token}")
    assert resp.status_code == 200

    list_calls = [c for c in mcp.calls if c["tool_name"] == "mongodb_list_collections"]
    assert len(list_calls) == 1
    args = list_calls[0]["args"]
    assert "database" not in args, f"database key must be absent, got {args=}"
    assert args == {}


def test_with_db_in_connection_string_passes_database_key(client) -> None:
    """When the URL has /<dbname>, mongodb_list_collections must include database=dbname."""
    token = _connect(client, "mongodb://u:p@host:27017/mydb")
    mcp = _deps_mcp()
    assert mcp is not None
    mcp.subprocesses[token] = True
    mcp.set_result("mongodb_list_collections", {"collections": []})

    resp = client.get(f"/api/v1/sample/{token}")
    assert resp.status_code == 200

    list_calls = [c for c in mcp.calls if c["tool_name"] == "mongodb_list_collections"]
    assert len(list_calls) == 1
    assert list_calls[0]["args"] == {"database": "mydb"}


def test_no_db_collection_schema_passes_no_database_key(client) -> None:
    """mongodb_collection_schema must also omit the database key when no DB is given."""
    token = _connect(client, "mongodb://u:p@host:27017")
    mcp = _deps_mcp()
    assert mcp is not None
    mcp.subprocesses[token] = True
    mcp.set_result("mongodb_list_collections", {"collections": [{"name": "users"}]})
    mcp.set_result(
        "mongodb_collection_schema",
        {"fields": ["_id", "email"], "doc_count": 10},
    )

    resp = client.get(f"/api/v1/sample/{token}")
    assert resp.status_code == 200

    schema_calls = [c for c in mcp.calls if c["tool_name"] == "mongodb_collection_schema"]
    assert len(schema_calls) == 1
    args = schema_calls[0]["args"]
    assert "database" not in args
    assert args == {"collection": "users"}
