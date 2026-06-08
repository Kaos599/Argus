"""Manual integration test: MCP subprocess with real MongoDB.

Usage:
  python -m tests.manual.test_mcp_real

Requires ARGUS_CONNECTION_STRING env var.
"""

import asyncio
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
        print("Calling mongodb_list_collections")
        res1 = await mcp.call_tool(
            "mongodb_list_collections", {"database": "argus_mock_db"}
        )
        print(res1)

        print("Calling mongodb_collection_schema on orders")
        res2 = await mcp.call_tool(
            "mongodb_collection_schema",
            {"database": "argus_mock_db", "collection": "orders"},
        )
        print(res2)
    finally:
        await mcp.kill()


asyncio.run(main())
