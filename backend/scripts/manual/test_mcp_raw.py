"""Manual integration test: inspect raw MCP responses.

Usage:
  python -m tests.manual.test_mcp_raw

Requires ARGUS_CONNECTION_STRING env var.
"""

import asyncio
import json
import os
from argus.mcp.subprocess import spawn_subprocess

CONNECTION_STRING = os.environ.get("ARGUS_CONNECTION_STRING")

if not CONNECTION_STRING:
    raise RuntimeError(
        "Set ARGUS_CONNECTION_STRING to a real MongoDB connection string.\n"
        '  $env:ARGUS_CONNECTION_STRING="mongodb+srv://user:pass@cluster.mongodb.net/db"'
    )


async def main():
    mcp = await spawn_subprocess("test_tenant", CONNECTION_STRING)
    try:
        import argus.mcp.subprocess as sub

        original = sub._normalize_tool_result

        def custom_norm(name, res):
            print("RAW RESULT:")
            print(json.dumps(res, indent=2))
            return original(name, res)

        sub._normalize_tool_result = custom_norm

        print("Calling mongodb_collection_schema")
        res1 = await mcp.call_tool(
            "mongodb_collection_schema",
            {"database": "argus_mock_db", "collection": "orders"},
        )
        print("FINAL:")
        print(res1)
    finally:
        await mcp.kill()


asyncio.run(main())
