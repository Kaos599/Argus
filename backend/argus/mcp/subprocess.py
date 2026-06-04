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
import re
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
    connection_string: str
    process: asyncio.subprocess.Process
    port: int
    base_url: str
    last_used: float = field(default_factory=time.monotonic)
    request_id: int = 1
    session_id: str | None = None

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

        mcp_tool_name = _to_mcp_tool_name(tool_name)
        payload = {
            "jsonrpc": "2.0",
            "id": self._record.next_request_id(),
            "method": "tools/call",
            "params": {"name": mcp_tool_name, "arguments": safe_args},
        }
        url = f"{self._record.base_url}/mcp"
        self._record.touch()

        logger.info(
            "mcp request tenant=%s tool=%s url=%s args=%s",
            self._record.tenant_id,
            tool_name,
            url,
            redact_connection_string(json.dumps(args, default=str)),
        )

        async with httpx.AsyncClient(timeout=timeout_s or settings.mcp_request_timeout_s) as client:
            await self._ensure_initialized(client)
            response = await client.post(
                url,
                json=payload,
                headers=_mcp_headers(self._record.session_id),
            )
            logger.info(
                "mcp response tenant=%s tool=%s status=%s",
                self._record.tenant_id,
                tool_name,
                response.status_code,
            )
            if response.is_error:
                logger.warning(
                    "mcp error response tenant=%s tool=%s status=%s body=%s",
                    self._record.tenant_id,
                    tool_name,
                    response.status_code,
                    redact_connection_string(response.text),
                )
            response.raise_for_status()
            data = _parse_mcp_response(response)

        if "error" in data:
            # MCP-level error (e.g., tool not found, bad args). Surface
            # the message; the caller decides whether to retry.
            err = data["error"]
            raise RuntimeError(
                f"MCP error from {tool_name}: code={err.get('code')} message={err.get('message')}"
            )

        result = data.get("result", {})
        _raise_for_mcp_tool_error(tool_name, result)
        return _normalize_tool_result(tool_name, result)

    async def _ensure_initialized(self, client: httpx.AsyncClient) -> None:
        if self._record.session_id is not None:
            return

        payload = {
            "jsonrpc": "2.0",
            "id": self._record.next_request_id(),
            "method": "initialize",
            "params": {
                "protocolVersion": "2025-03-26",
                "capabilities": {},
                "clientInfo": {"name": "argus", "version": settings.version},
            },
        }
        url = f"{self._record.base_url}/mcp"
        response = await client.post(url, json=payload, headers=_mcp_headers())
        if response.is_error:
            logger.warning(
                "mcp initialize failed tenant=%s status=%s body=%s",
                self._record.tenant_id,
                response.status_code,
                redact_connection_string(response.text),
            )
        response.raise_for_status()
        _parse_mcp_response(response)

        session_id = response.headers.get("mcp-session-id")
        if not session_id:
            raise RuntimeError("MCP initialize response did not include mcp-session-id")
        self._record.session_id = session_id
        await self._notify_initialized(client)

    async def _notify_initialized(self, client: httpx.AsyncClient) -> None:
        """Complete the MCP handshake before any ``tools/call``.

        Streamable HTTP requires ``notifications/initialized`` after
        ``initialize``. Without it, tool calls fail with a generic
        "you need to connect" error even when a connection string was
        injected via ``MDB_MCP_CONNECTION_STRING`` at subprocess spawn.
        """
        response = await client.post(
            f"{self._record.base_url}/mcp",
            json={"jsonrpc": "2.0", "method": "notifications/initialized"},
            headers=_mcp_headers(self._record.session_id),
        )
        if response.is_error:
            logger.warning(
                "mcp initialized notification failed tenant=%s status=%s body=%s",
                self._record.tenant_id,
                response.status_code,
                redact_connection_string(response.text),
            )
        response.raise_for_status()
        if response.content.strip():
            _parse_mcp_response(response)

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


def _mcp_headers(session_id: str | None = None) -> dict[str, str]:
    headers = {
        "Accept": "application/json, text/event-stream",
        "Content-Type": "application/json",
    }
    if session_id:
        headers["mcp-session-id"] = session_id
    return headers


def _to_mcp_tool_name(tool_name: str) -> str:
    return {
        "mongodb_list_collections": "list-collections",
        "mongodb_collection_schema": "collection-schema",
        "mongodb_find": "find",
        "mongodb_aggregate": "aggregate",
    }.get(tool_name, tool_name)


def _parse_mcp_response(response: httpx.Response) -> dict[str, Any]:
    content_type = response.headers.get("content-type", "")
    if "text/event-stream" not in content_type:
        return response.json()

    for line in response.text.splitlines():
        if not line.startswith("data:"):
            continue
        data = line.removeprefix("data:").strip()
        if data:
            parsed = json.loads(data)
            if isinstance(parsed, dict):
                return parsed
    raise RuntimeError("MCP event-stream response did not contain a JSON data frame")


def _normalize_tool_result(tool_name: str, result: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(result, dict):
        return {}

    if tool_name == "mongodb_list_collections" and "collections" not in result:
        names = _extract_collection_names(result)
        return {"collections": [{"name": name} for name in names]}

    if tool_name == "mongodb_collection_schema" and "fields" not in result:
        schema = _extract_untrusted_json(result)
        if isinstance(schema, dict):
            return {"fields": list(schema.keys()), "doc_count": 0}
        return {"fields": [], "doc_count": 0}

    if tool_name in ("mongodb_find", "mongodb_aggregate") and "documents" not in result:
        documents = _extract_untrusted_json(result)
        if isinstance(documents, list):
            return {"documents": documents}
        if isinstance(documents, dict):
            return {"documents": [documents]}
        return {"documents": []}

    return result


def _raise_for_mcp_tool_error(tool_name: str, result: Any) -> None:
    if not isinstance(result, dict) or not result.get("isError"):
        return
    message = _result_text(result).strip() or "MCP tool returned an error"
    raise RuntimeError(f"MCP error from {tool_name}: {message}")


def _extract_collection_names(result: dict[str, Any]) -> list[str]:
    text = _result_text(result)
    untrusted = _extract_untrusted_text(text)
    names: list[str] = []
    for raw_line in untrusted.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        try:
            parsed = json.loads(line)
        except json.JSONDecodeError:
            parsed = line.strip('"')
        if isinstance(parsed, str) and parsed:
            names.append(parsed)
    return names


def _extract_untrusted_json(result: dict[str, Any]) -> Any:
    text = _result_text(result)
    untrusted = _extract_untrusted_text(text).strip()
    if not untrusted:
        return None
    try:
        return json.loads(untrusted)
    except json.JSONDecodeError:
        return None


_UNTRUSTED_BLOCK_RE = re.compile(
    r"<untrusted-user-data-([^>]+)>\s*(.*?)\s*</untrusted-user-data-\1>",
    flags=re.DOTALL,
)


def _extract_untrusted_text(text: str) -> str:
    """Return the payload inside the largest paired untrusted-user-data block.

    mongodb-mcp-server embeds a security warning that mentions the tags
    literally (``<untrusted-user-data-…> and </untrusted-user-data-…>``).
    A naive non-greedy match captures only ``and`` from that sentence.
    We match opening/closing tags with the same id and take the longest
    payload, which is always the real tool output.
    """
    candidates = [
        match.group(2).strip()
        for match in _UNTRUSTED_BLOCK_RE.finditer(text)
        if match.group(2).strip()
    ]
    if not candidates:
        return ""
    return max(candidates, key=len)


def _result_text(result: dict[str, Any]) -> str:
    content = result.get("content")
    if not isinstance(content, list):
        return ""
    parts = [item.get("text", "") for item in content if isinstance(item, dict)]
    return "\n".join(part for part in parts if isinstance(part, str))


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


async def _wait_for_port_ready(
    proc: asyncio.subprocess.Process,
    host: str,
    port: int,
    timeout_s: float,
) -> None:
    """Wait for the MCP subprocess to accept a TCP connection."""
    deadline = time.monotonic() + timeout_s
    while True:
        if proc.returncode is not None:
            stderr = await proc.stderr.read()
            raise RuntimeError(
                "mongodb-mcp-server exited before binding the port: "
                f"returncode={proc.returncode}, stderr={stderr.decode(errors='replace')}"
            )

        try:
            reader, writer = await asyncio.open_connection(host, port)
        except (OSError, asyncio.TimeoutError) as exc:
            if time.monotonic() >= deadline:
                stderr = await proc.stderr.read()
                raise RuntimeError(
                    "mongodb-mcp-server did not bind the port within "
                    f"{timeout_s}s: stderr={stderr.decode(errors='replace')}",
                ) from exc
            await asyncio.sleep(0.1)
            continue
        else:
            writer.close()
            try:
                await writer.wait_closed()
            except AttributeError:
                pass
            return


async def _log_subprocess_output(proc: asyncio.subprocess.Process, tenant_id: str) -> None:
    """Log stderr from the subprocess while it runs."""
    assert proc.stderr is not None
    try:
        while True:
            line = await proc.stderr.readline()
            if not line:
                break
            logger.warning(
                "mongodb-mcp-server tenant=%s stderr=%s",
                tenant_id,
                line.decode(errors="replace").rstrip(),
            )
    except Exception:
        logger.exception(
            "failed reading mongodb-mcp-server stderr for tenant=%s",
            tenant_id,
        )


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

    asyncio.create_task(_log_subprocess_output(proc, tenant_id))
    await _wait_for_port_ready(proc, host, port, settings.mcp_startup_timeout_s)

    record = _SubprocessRecord(
        tenant_id=tenant_id,
        connection_string=connection_string,
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
