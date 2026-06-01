"""Argus backend — FastAPI app entry point.

Wires the 11 API endpoints under ``/api/v1``, runs the FastAPI
lifespan (which starts the MCP reaper), and configures CORS for the
frontend.

Run locally with:

    uvicorn argus.main:app --port 8080

The Dockerfile uses the same command.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from argus.api import (
    connect,
    dashboard,
    events,
    health,
    plan,
    probe,
    refresh,
    render,
    sample,
)
from argus.api.dependencies import (
    init_singletons,
    start_background_tasks,
    stop_background_tasks,
)
from argus.config import settings

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------


def _configure_logging() -> None:
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


_configure_logging()
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """FastAPI lifespan: initialise singletons, start the MCP reaper."""
    logger.info("argus backend starting (version=%s)", settings.version)
    init_singletons()
    await start_background_tasks()
    try:
        yield
    finally:
        logger.info("argus backend shutting down")
        await stop_background_tasks()


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------


app = FastAPI(
    title="Argus Backend",
    description=(
        "The agentic analyst for MongoDB Atlas. Read-only by design. "
        "Three layers of write protection: (1) mongodb-mcp-server --readOnly, "
        "(2) per-tenant connection string in the subprocess env, "
        "(3) the result_set_guard middleware that blocks $out/$merge."
    ),
    version=settings.version,
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
)


# CORS — the frontend is on a different origin. We allow the
# configured origins plus common dev origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Route registration
# ---------------------------------------------------------------------------


def _register_routers() -> None:
    """Mount all 11 API routers under ``/api/v1``."""
    app.include_router(connect.router, prefix="/api/v1")
    app.include_router(probe.router, prefix="/api/v1")
    app.include_router(sample.router, prefix="/api/v1")
    app.include_router(plan.router, prefix="/api/v1")
    app.include_router(render.router, prefix="/api/v1")
    app.include_router(dashboard.router, prefix="/api/v1")
    app.include_router(refresh.router, prefix="/api/v1")
    app.include_router(health.router, prefix="/api/v1")
    app.include_router(events.router, prefix="/api/v1")


_register_routers()


# ---------------------------------------------------------------------------
# Dev entrypoint
# ---------------------------------------------------------------------------


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run(
        "argus.main:app",
        host=settings.backend_host,
        port=settings.backend_port,
        log_level=settings.log_level.lower(),
    )
