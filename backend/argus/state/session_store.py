"""In-memory session store.

Each session holds:

- ``connection_string`` — the user's MongoDB connection string. This
  is the secret the per-tenant subprocess receives. We keep it in
  memory for v1; v2 can plug in Redis or Memorystore.
- ``created_at`` / ``last_used`` — for the 24-hour TTL.
- ``sampled_schema`` — the most recent schema sample, used by the
  planner to avoid re-sampling on every plan call.
- ``plan`` — the most recent plan (plan_id → list of PlanStep).
- ``cards`` — the cards currently on the user's dashboard.
- ``layout`` — the per-breakpoint react-grid-layout.

The store is async to match the FastAPI surface and to make a
v2 Redis-backed drop-in trivial.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

from argus.config import settings


@dataclass
class Session:
    """A single tenant session."""

    connection_string: str
    created_at: float = field(default_factory=time.time)
    last_used: float = field(default_factory=time.time)
    sampled_schema: dict[str, Any] = field(default_factory=dict)
    plans: dict[str, list[dict]] = field(default_factory=dict)
    cards: list[dict] = field(default_factory=list)
    layout: dict[str, list[dict]] = field(default_factory=dict)

    def touch(self) -> None:
        self.last_used = time.time()


class SessionStore:
    """In-memory session store with 24-hour TTL.

    Methods are async so the API layer can ``await`` them; this makes
    a v2 swap to Redis (where the calls are also async) transparent.
    """

    def __init__(self, *, ttl_s: int | None = None) -> None:
        self._ttl = ttl_s or settings.session_ttl_s
        self._sessions: dict[str, Session] = {}
        self._lock = asyncio.Lock()

    async def create(self, connection_string: str) -> str:
        """Create a new session, return the new session token."""
        token = uuid.uuid4().hex
        async with self._lock:
            self._sessions[token] = Session(connection_string=connection_string)
        return token

    async def get(self, token: str) -> Session | None:
        """Return the session, or ``None`` if it doesn't exist or expired."""
        async with self._lock:
            self._evict_expired_locked()
            return self._sessions.get(token)

    async def require(self, token: str) -> Session:
        """Return the session, raising ``KeyError`` if missing/expired."""
        session = await self.get(token)
        if session is None:
            raise KeyError(f"session {token!r} not found or expired")
        return session

    async def update(self, token: str, **kwargs: Any) -> Session:
        """Update fields on a session.

        Supported keyword args: ``sampled_schema``, ``plan`` (a single
        plan dict, not the list), ``cards``, ``layout``.
        """
        async with self._lock:
            self._evict_expired_locked()
            session = self._sessions.get(token)
            if session is None:
                raise KeyError(f"session {token!r} not found or expired")
            for key, value in kwargs.items():
                if key == "plan":
                    # Special handling: store under plan_id inside the plans dict.
                    plan_id = value.get("plan_id")
                    if plan_id is None:
                        raise ValueError("plan update requires 'plan_id' in the plan dict")
                    session.plans[plan_id] = value.get("plan", [])
                elif hasattr(session, key):
                    setattr(session, key, value)
                else:
                    raise AttributeError(f"session has no attribute {key!r}")
            session.touch()
            return session

    async def delete(self, token: str) -> bool:
        """Delete a session. Returns True if it existed."""
        async with self._lock:
            return self._sessions.pop(token, None) is not None

    async def stats(self) -> dict[str, int]:
        async with self._lock:
            self._evict_expired_locked()
            return {"active": len(self._sessions)}

    def _evict_expired_locked(self) -> None:
        now = time.time()
        expired = [t for t, s in self._sessions.items() if now - s.last_used > self._ttl]
        for t in expired:
            del self._sessions[t]


__all__ = ["Session", "SessionStore"]
