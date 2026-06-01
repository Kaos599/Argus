# X1 — MCP Subprocess Scope Decision

**Audit finding:** The plan had three contradictory claims about MCP subprocess lifetime:
- `argus.txt` says "per request" (subprocess spawned for each API call, killed on response)
- `ARCHITECTURE.md` says "per session" (subprocess spawned at connect, kept alive for the session)
- The cron flow says "resume or respawn" (subprocess is persistent but can die and respawn)

None of these work cleanly on Cloud Run, which is serverless and may cold-start on any request.

**User decision:** Apply the audit's recommended fix (not explicitly addressed, treated as silent accept).

**Decision:** Per-tenant subprocess, lazy respawn on each API call if PID is dead, 5-min idle timeout, max 10 concurrent subprocesses per Cloud Run instance.

---

## Why the three claims don't work

### "Per request" — kills the connection pool

Every API call spawns a fresh `mongodb-mcp-server` subprocess with the user's connection string. The subprocess initializes, opens a TCP connection to MongoDB, runs the tool call, and exits.

- **Latency:** Each call adds 200-500ms of subprocess startup overhead. A typical insight module might call 3-5 MCP tools, so 1-2.5 seconds of overhead per insight.
- **MongoDB load:** Each call opens a new connection. The MongoDB driver's connection pool can't help because each pool lives only as long as the subprocess.
- **MCP server cost:** Each subprocess spins up a Node.js runtime. With 100 concurrent users, that's 100 Node.js runtimes spinning up per second.
- **Doesn't work on Cloud Run:** Cloud Run may serve multiple requests on the same instance, so the "per request" subprocess pattern means each instance is constantly spawning and killing subprocesses.

### "Per session" — doesn't work on serverless

A subprocess is spawned when the user connects to their MongoDB. It's kept alive for the duration of the session (e.g., 24 hours or until the user disconnects).

- **Doesn't work on Cloud Run:** Cloud Run instances are ephemeral. They can be killed at any time (scale-down, deployment, instance restart). A long-lived subprocess is not guaranteed to survive.
- **Memory bloat:** Each instance has 10-20 long-lived subprocesses. Each subprocess holds a MongoDB connection. Cloud Run has 32GB memory cap per instance, so this is bounded, but the overhead is real.
- **Cold start:** When a new instance spins up, no subprocesses are pre-warm. The first user request has to spawn a new subprocess.

### "Resume or respawn" — vague, probably broken

This is what the cron flow says, but it doesn't actually specify the lifetime. It's a placeholder, not a design.

---

## The Right Answer: Per-tenant subprocess, lazy respawn, idle timeout

### Core design

1. **Each tenant gets their own subprocess.** Tenant identity is the session token (issued at `/connect`, scoped to the user's connection string).
2. **Subprocess lifetime:** 5-minute idle timeout. The subprocess is killed 5 minutes after its last use. The next API call lazily respawns it.
3. **Lazy respawn:** If the subprocess is dead (either idle-killed, instance restart, or first request), the manager spawns a new one on the next API call.
4. **Bounded concurrency:** Max 10 concurrent subprocesses per Cloud Run instance. If a request comes in and we're at the limit, evict the LRU subprocess to make room.
5. **Connection string isolation:** The subprocess's environment has the user's connection string. No subprocess can see another tenant's connection string.

### Implementation sketch (Python)

```python
# argus-mcp-manager.py
import asyncio
import os
import signal
import time
from typing import Optional

class McpManager:
    def __init__(self, max_subprocesses: int = 10, idle_timeout_s: int = 300):
        self.max_subprocesses = max_subprocesses
        self.idle_timeout_s = idle_timeout_s
        self.subprocesses: dict[str, Subprocess] = {}  # tenant_id -> Subprocess
        self.lock = asyncio.Lock()

    async def call_tool(self, tenant_id: str, tool_name: str, args: dict) -> dict:
        async with self.lock:
            sp = self.subprocesses.get(tenant_id)
            if sp is None or sp.is_dead():
                if len(self.subprocesses) >= self.max_subprocesses:
                    # Evict LRU
                    lru_id = min(self.subprocesses, key=lambda k: self.subprocesses[k].last_used)
                    await self.subprocesses[lru_id].kill()
                    del self.subprocesses[lru_id]
                sp = await self._spawn(tenant_id)
                self.subprocesses[tenant_id] = sp
            sp.last_used = time.time()
        
        return await sp.call_tool(tool_name, args)

    async def _spawn(self, tenant_id: str) -> 'Subprocess':
        # Look up connection string for this tenant
        conn_str = await self._get_connection_string(tenant_id)
        # Spawn mongodb-mcp-server with HTTP transport on a unique port
        port = self._allocate_port()
        proc = await asyncio.create_subprocess_exec(
            'mongodb-mcp-server',
            '--transport', 'http',
            '--httpHost', '127.0.0.1',
            '--httpPort', str(port),
            '--readOnly',
            env={**os.environ, 'MDB_MCP_CONNECTION_STRING': conn_str},
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        return Subprocess(tenant_id, proc, port)

    async def _idle_reaper(self):
        """Background task that kills subprocesses idle for > idle_timeout_s."""
        while True:
            await asyncio.sleep(60)
            now = time.time()
            async with self.lock:
                for tenant_id, sp in list(self.subprocesses.items()):
                    if now - sp.last_used > self.idle_timeout_s:
                        await sp.kill()
                        del self.subprocesses[tenant_id]


class Subprocess:
    def __init__(self, tenant_id, proc, port):
        self.tenant_id = tenant_id
        self.proc = proc
        self.port = port
        self.last_used = time.time()
        self.base_url = f'http://127.0.0.1:{port}'

    def is_dead(self) -> bool:
        return self.proc.returncode is not None

    async def call_tool(self, tool_name: str, args: dict) -> dict:
        # HTTP call to mongodb-mcp-server's tool endpoint
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f'{self.base_url}/mcp',
                json={'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call', 'params': {'name': tool_name, 'arguments': args}}
            ) as resp:
                return await resp.json()

    async def kill(self):
        try:
            self.proc.send_signal(signal.SIGTERM)
            await asyncio.wait_for(self.proc.wait(), timeout=5)
        except (ProcessLookupError, asyncio.TimeoutError):
            self.proc.kill()
```

### Why this works on Cloud Run

1. **Subprocess lifetime ≤ 5 min.** Cloud Run's typical instance lifetime is hours, so 5 min is well within bounds. The subprocess is short-lived enough that instance restarts don't lose much state.
2. **Lazy respawn handles instance restarts.** When a Cloud Run instance restarts, all subprocesses are gone. The next API call to that instance triggers a respawn. Latency cost: 200-500ms (the subprocess startup).
3. **Bounded concurrency protects the instance.** Max 10 subprocesses × ~50MB each = 500MB. Cloud Run has up to 32GB, so 10 is conservative. Adjust based on real load.
4. **Per-tenant isolation is real.** Each subprocess has its own connection string in its env. No subprocess can read another tenant's string. (The subprocess's env is inherited from the Python parent; we set it explicitly so there's no leakage from a prior tenant.)
5. **The mongodb-mcp-server's HTTP transport is the integration point.** The subprocess listens on 127.0.0.1:<port>, only reachable from the same Cloud Run instance. No internet exposure.

### Why this works for the per-tenant use case

- **Tenant connects to MongoDB at `/connect`.** The connection string is stored in our session store (Postgres or Memorystore), not in the subprocess.
- **Tenant's first API call spawns the subprocess.** The subprocess gets the connection string from our session store. Spawn takes 200-500ms.
- **Subsequent calls reuse the subprocess.** No respawn needed. Latency is the HTTP call to localhost:port + the MongoDB query. Typical: 50-200ms.
- **5 minutes of inactivity → subprocess is killed.** This is fast enough to release MongoDB connections for inactive tenants, slow enough to support normal "user opens dashboard, scrolls around for 5 minutes" patterns.
- **Tenant's 11th concurrent request triggers LRU eviction.** This is the safety valve. The team should monitor the eviction rate to tune `max_subprocesses`.

---

## Configuration & tuning

| Parameter | Default | Tune by |
|---|---|---|
| `max_subprocesses` | 10 | Cloud Run instance memory; observation of LRU evictions |
| `idle_timeout_s` | 300 (5 min) | User behavior data; MongoDB connection limits |
| `subprocess_startup_timeout_s` | 5 | Local measurement of mongodb-mcp-server cold start |
| `mcp_request_timeout_s` | 30 | Long-running aggregation tools |

For the hackathon, these defaults are reasonable. Tune during the demo if you see issues.

---

## What this means for the argus.txt / ARCHITECTURE.md update

The two docs need to be reconciled. The next pass should:
- Delete the "per request" claim from argus.txt.
- Delete the "per session" claim from ARCHITECTURE.md.
- Add a new section "MCP Subprocess Lifecycle" in ARCHITECTURE.md with the design above.
- Reference this file from both docs.

---

## What this means for the demo

- The first request to a fresh instance has 200-500ms of cold start. The 3-min video should either (a) start with a warm-up request, or (b) accept the cold start as part of the demo.
- The first request to a new tenant has 200-500ms of subprocess spawn. The onboarding flow has plenty of latency already (planner LLM call, etc.), so this is hidden.
- A 5-minute idle timeout means: if the judge comes back to the demo after 5 minutes, they'll see a respawn. This is fine.

---

## Why this is the right design (and not something simpler)

- **"Just use a long-lived subprocess pool with no idle timeout"** — doesn't bound memory; a high-traffic tenant could hold 10 connections forever.
- **"Use a single shared subprocess with a connection pool"** — mongodb-mcp-server doesn't support per-tenant connection routing; the subprocess only holds one connection string at a time.
- **"Use a Mongo driver directly, no MCP"** — loses the MCP tool surface, which is the rubric criterion.
- **"Use the MCP HTTP server as a single shared resource"** — can't, because each connection string is a different MongoDB user with different permissions.

Per-tenant subprocess with lazy respawn is the only design that satisfies:
1. Per-tenant connection string isolation.
2. Bounded memory.
3. Serverless-friendly.
4. MCP-compatible.
5. Low latency for active tenants.
