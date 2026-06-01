"""Environment configuration for Argus backend.

All configuration is loaded once at module import time from environment
variables (or a `.env` file in development). No secrets are read from
the filesystem or hardcoded.
"""

from __future__ import annotations

import os
from collections.abc import Sequence
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


def _env(name: str, default: str | None = None) -> str | None:
    val = os.environ.get(name)
    return val if val not in (None, "") else default


def _env_int(name: str, default: int) -> int:
    raw = _env(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise ValueError(f"Environment variable {name}={raw!r} is not a valid int") from exc


def _env_list(name: str, default: Sequence[str] = ()) -> list[str]:
    raw = _env(name)
    if raw is None:
        return list(default)
    return [part.strip() for part in raw.split(",") if part.strip()]


@dataclass(frozen=True)
class Settings:
    """Strongly-typed application settings. Frozen so callers can't mutate."""

    # Server
    backend_host: str = field(
        default_factory=lambda: _env("ARGUS_BACKEND_HOST", "0.0.0.0") or "0.0.0.0"
    )
    backend_port: int = field(default_factory=lambda: _env_int("ARGUS_BACKEND_PORT", 8080))
    log_level: str = field(default_factory=lambda: _env("ARGUS_LOG_LEVEL", "INFO") or "INFO")
    cors_origins: list[str] = field(
        default_factory=lambda: _env_list("ARGUS_CORS_ORIGINS", ["http://localhost:3000"])
    )
    version: str = field(default_factory=lambda: _env("ARGUS_VERSION", "0.1.0") or "0.1.0")

    # MCP subprocess management
    max_mcp_subprocesses: int = field(
        default_factory=lambda: _env_int("ARGUS_MAX_MCP_SUBPROCESSES", 10)
    )
    mcp_idle_timeout_s: int = field(
        default_factory=lambda: _env_int("ARGUS_MCP_IDLE_TIMEOUT_S", 300)
    )
    mcp_startup_timeout_s: int = field(
        default_factory=lambda: _env_int("ARGUS_MCP_STARTUP_TIMEOUT_S", 5)
    )
    mcp_request_timeout_s: int = field(
        default_factory=lambda: _env_int("ARGUS_MCP_REQUEST_TIMEOUT_S", 30)
    )
    mcp_server_version: str = field(
        default_factory=lambda: _env("MONGODB_MCP_SERVER_VERSION", "1.2.3") or "1.2.3"
    )
    mcp_default_host: str = field(
        default_factory=lambda: _env("ARGUS_MCP_HOST", "127.0.0.1") or "127.0.0.1"
    )

    # Result-set guard
    max_documents_per_query: int = field(
        default_factory=lambda: _env_int("ARGUS_MAX_DOCUMENTS_PER_QUERY", 1000)
    )

    # Session
    session_ttl_s: int = field(
        default_factory=lambda: _env_int("ARGUS_SESSION_TTL_S", 24 * 60 * 60)
    )

    # Gemini
    gemini_api_key: str | None = field(default_factory=lambda: _env("GEMINI_API_KEY"))
    llm_model_primary: str = field(
        default_factory=lambda: (
            _env("ARGUS_LLM_MODEL_PRIMARY", "gemini-3-flash-preview") or "gemini-3-flash-preview"
        )
    )
    llm_model_fallback: str = field(
        default_factory=lambda: (
            _env("ARGUS_LLM_MODEL_FALLBACK", "gemini-2.5-flash") or "gemini-2.5-flash"
        )
    )
    llm_model_last_resort: str = field(
        default_factory=lambda: (
            _env("ARGUS_LLM_MODEL_LAST_RESORT", "gemini-2.5-flash-lite") or "gemini-2.5-flash-lite"
        )
    )
    llm_circuit_window_s: int = field(
        default_factory=lambda: _env_int("ARGUS_LLM_CIRCUIT_WINDOW_S", 60)
    )
    llm_circuit_threshold: int = field(
        default_factory=lambda: _env_int("ARGUS_LLM_CIRCUIT_THRESHOLD", 3)
    )


settings = Settings()
