"""MCP subprocess manager — per-tenant subprocess lifecycle.

The manager is the only component that owns subprocess lifetimes:

- One subprocess per tenant (keyed by ``tenant_id``/session token).
- 5-minute idle timeout (configurable).
- Max 10 concurrent subprocesses per process (configurable). LRU eviction.
- Lazy respawn if the subprocess is dead.
- A background task runs the idle reaper every 60 seconds.

This module is used directly by the API layer — every MCP tool call
goes through ``McpManager.call_tool``, which looks up or spawns the
subprocess for the requesting session.

Connection strings are looked up from the ``ConnectionStringProvider``
protocol, which the manager calls. The default implementation reads
from the in-memory session store; tests can plug in a mock.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from typing import Protocol

from argus.config import settings
from argus.mcp.subprocess import (
    McpSubprocess,
    _PortAllocator,
    spawn_subprocess,
)

logger = logging.getLogger(__name__)


class ConnectionStringProvider(Protocol):
    """A pluggable source for tenant connection strings.

    The manager doesn't store connection strings itself — it asks a
    provider. The default implementation reads from the in-memory
    session store, but this can be swapped for Redis in v2.
    """

    async def get(self, tenant_id: str) -> str | None: ...


class SessionStoreConnectionProvider:
    """Default ``ConnectionStringProvider`` backed by a session store.

    The session store is any object with an async ``get(token)`` method
    returning an object with a ``connection_string`` attribute (or
    ``None``). The default session store (``argus.state.session_store``)
    satisfies this protocol.
    """

    def __init__(self, store: object) -> None:
        self._store = store

    async def get(self, tenant_id: str) -> str | None:
        session = await self._store.get(tenant_id)  # type: ignore[attr-defined]
        if session is None:
            return None
        return getattr(session, "connection_string", None)


# ---------------------------------------------------------------------------
# Manager
# ---------------------------------------------------------------------------


@dataclass
class _Stats:
    """Subprocess health stats for the /health endpoint."""

    active: int
    max: int


class McpManager:
    """Per-tenant subprocess manager.

    Thread-safe via a single ``asyncio.Lock``. Spawns subprocesses
    on-demand, evicts LRU when at capacity, and runs a background
    idle-reaper task.
    """

    def __init__(
        self,
        connection_provider: ConnectionStringProvider,
        *,
        max_subprocesses: int | None = None,
        idle_timeout_s: int | None = None,
        reaper_interval_s: float = 60.0,
        clock: callable = time.monotonic,
    ) -> None:
        self._provider = connection_provider
        self._max = max_subprocesses or settings.max_mcp_subprocesses
        self._idle_timeout = idle_timeout_s or settings.mcp_idle_timeout_s
        self._reaper_interval = reaper_interval_s
        self._clock = clock

        self._subprocesses: dict[str, McpSubprocess] = {}
        self._port_allocator = _PortAllocator()
        self._lock = asyncio.Lock()
        self._reaper_task: asyncio.Task[None] | None = None
        self._started_at: float = self._clock()

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def start(self) -> None:
        """Start the background reaper. Idempotent."""
        if self._reaper_task is None or self._reaper_task.done():
            self._reaper_task = asyncio.create_task(
                self._idle_reaper_loop(), name="argus-mcp-reaper"
            )

    async def stop(self) -> None:
        """Cancel the reaper and kill all subprocesses. Idempotent."""
        if self._reaper_task is not None and not self._reaper_task.done():
            self._reaper_task.cancel()
            try:
                await self._reaper_task
            except asyncio.CancelledError:
                pass
            self._reaper_task = None

        async with self._lock:
            tenants = list(self._subprocesses.keys())
            for tenant_id in tenants:
                await self._kill(tenant_id)
            self._subprocesses.clear()

    # ------------------------------------------------------------------
    # Subprocess access
    # ------------------------------------------------------------------

    async def call_tool(
        self,
        tenant_id: str,
        tool_name: str,
        args: dict,
        *,
        timeout_s: float | None = None,
    ) -> dict:
        """Look up (or spawn) the tenant's subprocess, then call a tool.

        The args dict is passed through the result-set guard inside
        ``McpSubprocess.call_tool`` before being sent to the subprocess.

        Raises ``KeyError`` if the tenant has no connection string.
        """
        sub = await self._get_or_spawn(tenant_id)
        return await sub.call_tool(tool_name, args, timeout_s=timeout_s)

    async def has_subprocess(self, tenant_id: str) -> bool:
        async with self._lock:
            sub = self._subprocesses.get(tenant_id)
            return sub is not None and sub.is_alive()

    # ------------------------------------------------------------------
    # Health
    # ------------------------------------------------------------------

    def stats(self) -> _Stats:
        """Return current subprocess stats for the /health endpoint."""
        return _Stats(active=len(self._subprocesses), max=self._max)

    def uptime_s(self) -> float:
        return self._clock() - self._started_at

    # ------------------------------------------------------------------
    # Internal: spawn / evict / reap
    # ------------------------------------------------------------------

    async def _get_or_spawn(self, tenant_id: str) -> McpSubprocess:
        async with self._lock:
            existing = self._subprocesses.get(tenant_id)
            if existing is not None:
                if existing.is_alive():
                    existing.touch()
                    return existing
                # Stale entry — kill and respawn.
                await self._kill_locked(tenant_id)

            # Look up the connection string. If absent, we can't spawn.
            connection_string = await self._provider.get(tenant_id)
            if connection_string is None:
                raise KeyError(
                    f"no connection string for tenant {tenant_id!r} — did you call /connect?"
                )

            # Evict LRU if at capacity.
            if len(self._subprocesses) >= self._max:
                lru_id = min(
                    self._subprocesses.keys(),
                    key=lambda k: self._subprocesses[k].last_used,
                )
                logger.info("evicting LRU subprocess tenant=%s", lru_id)
                await self._kill_locked(lru_id)

            # Spawn outside the lock to avoid holding it during the
            # subprocess exec. Re-acquire to register.
            async with self._lock:
                # Re-check after re-acquiring (a concurrent caller may
                # have spawned in the meantime).
                existing = self._subprocesses.get(tenant_id)
                if existing is not None and existing.is_alive():
                    return existing
                if existing is not None:
                    await self._kill_locked(tenant_id)

                if len(self._subprocesses) >= self._max:
                    lru_id = min(
                        self._subprocesses.keys(),
                        key=lambda k: self._subprocesses[k].last_used,
                    )
                    await self._kill_locked(lru_id)

                sub = await spawn_subprocess(
                    tenant_id,
                    connection_string,
                    port_allocator=self._port_allocator,
                )
                self._subprocesses[tenant_id] = sub
                logger.info("spawned subprocess tenant=%s port=%d", tenant_id, sub.port)
                return sub

    async def _kill(self, tenant_id: str) -> None:
        async with self._lock:
            await self._kill_locked(tenant_id)

    async def _kill_locked(self, tenant_id: str) -> None:
        sub = self._subprocesses.pop(tenant_id, None)
        if sub is None:
            return
        self._port_allocator.release(sub.port)
        try:
            await sub.kill()
        except Exception:
            logger.exception("error killing subprocess for tenant=%s", tenant_id)

    async def _idle_reaper_loop(self) -> None:
        """Background loop: kill subprocesses idle for > idle_timeout_s."""
        try:
            while True:
                await asyncio.sleep(self._reaper_interval)
                await self._reap_once()
        except asyncio.CancelledError:
            return

    async def _reap_once(self) -> int:
        """Single reaper pass. Returns the number of subprocesses killed."""
        now = self._clock()
        async with self._lock:
            victims = [
                tid
                for tid, sub in self._subprocesses.items()
                if now - sub.last_used > self._idle_timeout or not sub.is_alive()
            ]
            for tid in victims:
                await self._kill_locked(tid)
        if victims:
            logger.info("reaper killed %d idle subprocesses", len(victims))
        return len(victims)


__all__ = [
    "ConnectionStringProvider",
    "McpManager",
    "SessionStoreConnectionProvider",
]
