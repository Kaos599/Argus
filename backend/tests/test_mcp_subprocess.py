"""Tests for the mongodb-mcp-server HTTP wrapper."""

from __future__ import annotations

import httpx
import pytest

from argus.mcp.subprocess import (
    _normalize_tool_result,
    _parse_mcp_response,
    _raise_for_mcp_tool_error,
    _to_mcp_tool_name,
)


def test_translates_argus_tool_aliases_to_mcp_tool_names() -> None:
    assert _to_mcp_tool_name("mongodb_list_collections") == "list-collections"
    assert _to_mcp_tool_name("mongodb_collection_schema") == "collection-schema"
    assert _to_mcp_tool_name("mongodb_aggregate") == "aggregate"
    assert _to_mcp_tool_name("mongodb_find") == "find"


def test_parses_streamable_http_sse_response() -> None:
    response = httpx.Response(
        200,
        headers={"content-type": "text/event-stream"},
        text='event: message\ndata: {"result":{"ok":true},"jsonrpc":"2.0","id":1}\n\n',
    )

    assert _parse_mcp_response(response) == {
        "result": {"ok": True},
        "jsonrpc": "2.0",
        "id": 1,
    }


def test_normalizes_list_collections_content() -> None:
    result = {
        "content": [
            {"type": "text", "text": 'Found 2 collections for database "vedai".'},
            {
                "type": "text",
                "text": (
                    "<untrusted-user-data-abc>\n"
                    '"users"\n'
                    '"orders"\n'
                    "</untrusted-user-data-abc>"
                ),
            },
        ]
    }

    assert _normalize_tool_result("mongodb_list_collections", result) == {
        "collections": [{"name": "users"}, {"name": "orders"}]
    }


def test_normalizes_list_collections_ignores_warning_tag_mention() -> None:
    """The MCP server warning mentions the tags before the real payload."""
    result = {
        "content": [
            {"type": "text", "text": 'Found 3 collections for database "vedai".'},
            {
                "type": "text",
                "text": (
                    "WARNING: between the <untrusted-user-data-abc> and "
                    "</untrusted-user-data-abc> tags may lead to issues.\n\n"
                    "<untrusted-user-data-abc>\n"
                    '"generatedpapers"\n'
                    '"assignments"\n'
                    '"users"\n'
                    "</untrusted-user-data-abc>"
                ),
            },
        ]
    }

    assert _normalize_tool_result("mongodb_list_collections", result) == {
        "collections": [
            {"name": "generatedpapers"},
            {"name": "assignments"},
            {"name": "users"},
        ]
    }


def test_normalizes_collection_schema_content() -> None:
    result = {
        "content": [
            {
                "type": "text",
                "text": (
                    "<untrusted-user-data-abc>\n"
                    '{"_id":{"types":[]},"email":{"types":[]}}\n'
                    "</untrusted-user-data-abc>"
                ),
            }
        ]
    }

    assert _normalize_tool_result("mongodb_collection_schema", result) == {
        "fields": ["_id", "email"],
        "doc_count": 0,
    }


def test_mcp_tool_error_raises_instead_of_normalizing_empty() -> None:
    result = {
        "content": [
            {
                "type": "text",
                "text": "The configured connection string is not valid.",
            }
        ],
        "isError": True,
    }

    with pytest.raises(RuntimeError, match="configured connection string is not valid"):
        _raise_for_mcp_tool_error("mongodb_list_collections", result)
