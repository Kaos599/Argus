"""Manual integration test: full flow (connect -> sample -> plan -> render).

Usage:
  python -m tests.manual.test_all_modules

Requires ARGUS_CONNECTION_STRING env var.
"""

import httpx
import asyncio
import os

CONNECTION_STRING = os.environ.get("ARGUS_CONNECTION_STRING")

if not CONNECTION_STRING:
    raise RuntimeError(
        "Set ARGUS_CONNECTION_STRING to a real MongoDB connection string.\n"
        '  $env:ARGUS_CONNECTION_STRING="mongodb+srv://user:pass@cluster.mongodb.net/db"'
    )


async def run_full_flow():
    async with httpx.AsyncClient(timeout=60.0) as client:
        conn_res = await client.post(
            "http://127.0.0.1:8080/api/v1/connect",
            json={"connection_string": CONNECTION_STRING},
        )
        token = conn_res.json()["session_token"]
        print(f"Connected, token: {token}")

        for i in range(10):
            sample_res = await client.get(
                f"http://127.0.0.1:8080/api/v1/sample/{token}"
            )
            if sample_res.status_code == 200:
                print("Sample ready")
                break
            await asyncio.sleep(2)

        modules = ["funnel", "cohort", "rfm", "attribution", "anomaly"]
        plan_res = await client.post(
            "http://127.0.0.1:8080/api/v1/plan",
            json={
                "session_token": token,
                "collections": ["users", "events", "orders", "logs"],
                "modules": modules,
            },
        )
        plan_id = plan_res.json()["plan_id"]
        print(f"Plan created, ID: {plan_id}")

        async with client.stream(
            "POST",
            "http://127.0.0.1:8080/api/v1/render",
            json={"session_token": token, "plan_id": plan_id},
            headers={"Accept": "text/event-stream"},
        ) as response:
            async for line in response.aiter_lines():
                if line:
                    print(line)


asyncio.run(run_full_flow())
