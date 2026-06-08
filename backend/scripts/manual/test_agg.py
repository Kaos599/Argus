"""Manual integration test: run an aggregation pipeline via MCP subprocess.

Usage:
  python -m tests.manual.test_agg

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
        pipeline = [
            {
                "$match": {
                    "$expr": {
                        "$gte": [
                            "$timestamp",
                            {
                                "$dateSubtract": {
                                    "startDate": "$$NOW",
                                    "unit": "day",
                                    "amount": 56,
                                }
                            },
                        ]
                    }
                }
            },
            {
                "$group": {
                    "_id": {"$dateTrunc": {"date": "$timestamp", "unit": "day"}},
                    "users": {"$addToSet": "$user_id"},
                    "event_count": {"$sum": 1},
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "date": "$_id",
                    "value": {"$size": "$users"},
                }
            },
            {"$sort": {"date": 1}},
        ]
        res = await mcp.call_tool(
            "mongodb_aggregate",
            {
                "database": "argus_mock_db",
                "collection": "events",
                "pipeline": pipeline,
            },
        )
        print("\nNORMALIZED RESPONSE FROM CALL_TOOL:")
        print(json.dumps(res, default=str))
    except Exception as e:
        print("EXCEPTION:", e)
    finally:
        await mcp.kill()


asyncio.run(main())
