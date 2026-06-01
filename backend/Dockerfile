# syntax=docker/dockerfile:1.7
# Multi-stage build for the Argus backend.
# Stage 1: builder — install mongodb-mcp-server and Python deps into a venv.
# Stage 2: runtime — slim image with the venv + mongodb-mcp-server binary.

ARG PYTHON_VERSION=3.12
ARG MCP_SERVER_VERSION=1.2.3

# ---------------------------------------------------------------------------
# Stage 1: builder
# ---------------------------------------------------------------------------
FROM python:${PYTHON_VERSION}-slim AS builder

ARG MCP_SERVER_VERSION
ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1

# System deps for the mongodb-mcp-server npm install.
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
        nodejs \
        npm \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Install the official mongodb-mcp-server globally so its binary is
# on PATH for the runtime stage. Pinned per .env.example.
RUN npm install -g "mongodb-mcp-server@${MCP_SERVER_VERSION}" \
    && which mongodb-mcp-server

# Create a venv so we can copy it into the runtime stage in one move.
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:${PATH}"

# Copy the project metadata and install Python deps.
COPY pyproject.toml ./
RUN pip install --upgrade pip \
    && pip install \
        "fastapi>=0.115" \
        "uvicorn[standard]>=0.32" \
        "pydantic>=2.10" \
        "pydantic-settings>=2.7" \
        "httpx>=0.28" \
        "python-dotenv>=1.0" \
        "pyyaml>=6.0" \
        "orjson>=3.10" \
        "google-generativeai>=0.8" \
        "pytest>=8.3" \
        "pytest-asyncio>=0.25" \
        "respx>=0.22" \
        "ruff>=0.8"

# Copy the rest of the source and install the project itself.
COPY argus ./argus
COPY tests ./tests
RUN pip install --no-deps .

# ---------------------------------------------------------------------------
# Stage 2: runtime
# ---------------------------------------------------------------------------
FROM python:${PYTHON_VERSION}-slim AS runtime

ARG MCP_SERVER_VERSION
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    HOST=0.0.0.0 \
    MDB_MCP_READ_ONLY=true

# Reinstall only the runtime system deps.
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
        nodejs \
        npm \
    && npm install -g "mongodb-mcp-server@${MCP_SERVER_VERSION}" \
    && rm -rf /var/lib/apt/lists/* \
    && which mongodb-mcp-server

# Copy the venv and project from the builder.
COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /build/argus /app/argus

ENV PATH="/opt/venv/bin:${PATH}"
WORKDIR /app

# Non-root runtime user for safety.
RUN useradd --create-home --shell /bin/bash argus \
    && chown -R argus:argus /app
USER argus

EXPOSE 8000

# Health check probes /api/v1/health every 30s.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:${PORT}/api/v1/health" || exit 1

# Run uvicorn. Host/port are env-overridable.
CMD ["sh", "-c", "uvicorn argus.main:app --host ${HOST} --port ${PORT}"]
