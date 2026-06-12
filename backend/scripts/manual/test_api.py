"""Manual integration test: connect and sample via a live backend.

Usage:
  python -m tests.manual.test_api

Requires ARGUS_CONNECTION_STRING env var.
"""

import httpx
import asyncio
import os

CONNECTION_STRING = os.environ.get("ARGUS_CONNECTION_STRING")

if not CONNECTION_STRING:
    raise RuntimeError(
        "Set ARGUS_CONNECTION_STRING to a real MongoDB connection string, e.g.\n"
        '  $env:ARGUS_CONNECTION_STRING="mongodb+srv://user:pass@cluster.mongodb.net/db"'
    )


async def main():
    async with httpx.AsyncClient() as client:
        r1 = await client.post(
            "http://127.0.0.1:8080/api/v1/connect",
            json={"connection_string": CONNECTION_STRING},
        )
        print("Connect Response:", r1.json())
        token = r1.json().get("session_token")
        if not token:
            print("No token, exiting")
            return
        r2 = await client.get(
            f"http://127.0.0.1:8080/api/v1/sample/{token}", timeout=10
        )
        print("Sample Response:", r2.json())


asyncio.run(main())
