"""Argus — the agentic analyst for MongoDB Atlas.

The backend FastAPI service that proxies MCP calls to a per-tenant
`mongodb-mcp-server` subprocess, enforces read-only at three layers,
and renders 5 insight modules as `CardDescriptor` outputs.
"""

from argus.main import app

__all__ = ["app"]
__version__ = "0.1.0"
