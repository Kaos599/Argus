"""Per-tenant subprocess wrapper around ``mongodb-mcp-server``.

Each subprocess is a Node.js ``mongodb-mcp-server`` started with
``--transport http`` and bound to a unique port on 127.0.0.1. The
subprocess inherits the tenant's connection string via the
``MDB_MCP_CONNECTION_STRING`` env var.

This module is responsible for:

- Spawning the subprocess.
- Tracking its PID, port, and last-use timestamp.
- Calling MCP tools by HTTP POST to ``http://127.0.0.1:<port>/mcp``.
- Killing the subprocess on idle eviction or shutdown.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import signal
import time
from dataclasses import dataclass, field
from typing import Any

import httpx

from argus.config import settings
from argus.guard.result_set_guard import GuardViolation, guard_tool_call, redact_connection_string

logger = logging.getLogger(__name__)


@dataclass
class _SubprocessRecord:
    """A live mongodb-mcp-server subprocess for one tenant."""

    tenant_id: str
    process: asyncio.subprocess.Process
    port: int
    base_url: str
    last_used: float = field(default_factory=time.monotonic)
    request_id: int = 1

    def is_alive(self) -> bool:
        """Return True if the subprocess is still running."""
        return self.process.returncode is None

    def next_request_id(self) -> int:
        self.request_id += 1
        return self.request_id

    def touch(self) -> None:
        self.last_used = time.monotonic()


# ---------------------------------------------------------------------------
# Port allocator
# ---------------------------------------------------------------------------


class _PortAllocator:
    """Allocates free localhost ports.

    The subprocess is bound to 127.0.0.1 only, so collision with the
    host network is bounded to other Argus subprocesses. We use the
    OS-assigned port range (let the kernel pick) and then read it
    back — but the spec says we pass a deterministic port, so we
    walk a small range and try each in turn.
    """

    _RANGE_START = 30000
    _RANGE_END = 40000

    def __init__(self) -> None:
        self._used: set[int] = set()
        self._cursor = self._RANGE_START

    def allocate(self) -> int:
        for _ in range(self._RANGE_END - self._RANGE_START):
            self._cursor += 1
            if self._cursor >= self._RANGE_END:
                self._cursor = self._RANGE_START
            if self._cursor in self._used:
                continue
            # We can't actually probe the port without a subprocess
            # listening. The caller will retry on EADDRINUSE.
            self._used.add(self._cursor)
            return self._cursor
        raise RuntimeError("No free ports available in the configured range")

    def release(self, port: int) -> None:
        self._used.discard(port)


# ---------------------------------------------------------------------------
# Subprocess wrapper
# ---------------------------------------------------------------------------


class McpSubprocess:
    """Public-facing handle for a single tenant's subprocess.

    Wraps a ``_SubprocessRecord`` and exposes ``call_tool`` plus a
    ``kill`` method. Does not handle lifecycle (that lives on
    ``McpManager``).
    """

    def __init__(self, record: _SubprocessRecord) -> None:
        self._record = record

    @property
    def tenant_id(self) -> str:
        return self._record.tenant_id

    @property
    def port(self) -> int:
        return self._record.port

    @property
    def last_used(self) -> float:
        return self._record.last_used

    def is_alive(self) -> bool:
        return self._record.is_alive()

    def touch(self) -> None:
        """Update the last-used timestamp. Called by ``McpManager`` after
        every tool call so the idle reaper doesn't kill active tenants.
        """
        self._record.touch()

    async def call_tool(
        self,
        tool_name: str,
        args: dict[str, Any],
        *,
        max_documents: int | None = None,
        timeout_s: float | None = None,
    ) -> dict[str, Any]:
        """Call an MCP tool by name. Returns the parsed JSON result.

        The args dict is passed through the result-set guard first:
        any pipeline is validated for forbidden stages, and a
        ``.limit()`` is enforced on find/aggregate.

        Raises ``GuardViolation`` on a guard failure, or
        ``httpx.HTTPError`` on a transport failure.
        """
        if not self._record.is_alive():
            raise RuntimeError(
                f"subprocess for tenant {self._record.tenant_id!r} is not alive "
                f"(returncode={self._record.process.returncode!r})"
            )

        try:
            safe_args = guard_tool_call(
                tool_name,
                args,
                max_documents=max_documents or settings.max_documents_per_query,
            )
        except GuardViolation:
            logger.warning(
                "guard rejected tool=%s tenant=%s args=%s",
                tool_name,
                self._record.tenant_id,
                redact_connection_string(json.dumps(args, default=str)),
            )
            raise

        payload = {
            "jsonrpc": "2.0",
            "id": self._record.next_request_id(),
            "method": "tools/call",
            "params": {"name": tool_name, "arguments": safe_args},
        }
        url = f"{self._record.base_url}/mcp"
        self._record.touch()

        async with httpx.AsyncClient(timeout=timeout_s or settings.mcp_request_timeout_s) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()

        if "error" in data:
            # MCP-level error (e.g., tool not found, bad args). Surface
            # the message; the caller decides whether to retry.
            err = data["error"]
            raise RuntimeError(
                f"MCP error from {tool_name}: code={err.get('code')} message={err.get('message')}"
            )

        return data.get("result", {})

    async def kill(self) -> None:
        """Terminate the subprocess. Idempotent."""
        proc = self._record.process
        if proc.returncode is not None:
            return
        try:
            proc.send_signal(signal.SIGTERM)
            try:
                await asyncio.wait_for(proc.wait(), timeout=5.0)
            except TimeoutError:
                proc.kill()
                await proc.wait()
        except ProcessLookupError:
            # Already dead.
            pass


# ---------------------------------------------------------------------------
# Subprocess spawning
# ---------------------------------------------------------------------------


def _build_subprocess_env(connection_string: str) -> dict[str, str]:
    """Build the env dict for the mongodb-mcp-server subprocess.

    We start from the current process env (so PATH, NODE_PATH, etc.,
    are inherited) and overlay the per-tenant settings.
    """
    env = dict(os.environ)
    env["MDB_MCP_READ_ONLY"] = "true"
    env["MDB_MCP_CONNECTION_STRING"] = connection_string
    # Don't let the subprocess inherit any leakage from prior
    # tenants — the env dict is fresh per spawn.
    return env


async def spawn_subprocess(
    tenant_id: str,
    connection_string: str,
    *,
    host: str = settings.mcp_default_host,
    port_allocator: _PortAllocator | None = None,
) -> McpSubprocess:
    """Spawn a new mongodb-mcp-server subprocess for one tenant.

    The subprocess is started with ``--transport http --httpHost=host
    --httpPort=port --readOnly``. The connection string is passed via
    env var, not CLI args, to avoid leaking through ``ps``.

    ``port_allocator`` is optional and only used by ``McpManager`` to
    coordinate port assignments across spawns.
    """
    # We don't strictly need a port allocator for the standalone path
    # — the kernel could pick one. But the spec says "unique port", so
    # we use the allocator. If we want zero-arg ``--httpPort=0`` we'd
    # need to read the chosen port back from stdout; the spec pins
    # the port, so this is simpler.
    if port_allocator is None:
        port_allocator = _PortAllocator()
    port = port_allocator.allocate()

    cmd = [
        "mongodb-mcp-server",
        "--transport",
        "http",
        "--httpHost",
        host,
        "--httpPort",
        str(port),
        "--readOnly",
    ]
    env = _build_subprocess_env(connection_string)

    logger.info(
        "spawning mongodb-mcp-server tenant=%s port=%d version=%s",
        tenant_id,
        port,
        settings.mcp_server_version,
    )

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        env=env,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    # Wait briefly for the subprocess to bind the port. This is a
    # pragmatic check; the MCP server prints "Server listening on..."
    # to stdout, but parsing it adds complexity. Instead, we
    # sleep for a short window proportional to the startup timeout.
    await asyncio.sleep(0.1)

    record = _SubprocessRecord(
        tenant_id=tenant_id,
        process=proc,
        port=port,
        base_url=f"http://{host}:{port}",
    )
    return McpSubprocess(record)


__all__ = [
    "McpSubprocess",
    "_PortAllocator",
    "spawn_subprocess",
]
