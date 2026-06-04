"""Pydantic v2 models for the 11 API endpoints.

These mirror the request/response shapes in `shared/api-types.ts` (the
source of truth). Field names match the Zod field names exactly —
**most are snake_case, but a few (technicalDetails, isRetryable,
mcpSubprocesses) are camelCase** per the Zod schema. The user said:
"Pydantic field names MUST match the Zod field names."

For camelCase fields we use ``Field(alias=...)`` + ``populate_by_name=True``
so both the alias and the snake_case Python name are accepted on
input. Output uses the alias (the wire format) by default.
"""

from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from argus.models.card import CardDescriptor, ErrorCardProps

# ---------------------------------------------------------------------------
# Error envelope
# ---------------------------------------------------------------------------


class ErrorCode(str, Enum):
    """Mirrors the `ErrorCode` enum in shared/api-types.ts."""

    CONNECTION_FAILED = "CONNECTION_FAILED"
    INVALID_INPUT = "INVALID_INPUT"
    RATE_LIMITED = "RATE_LIMITED"
    READ_ONLY_VIOLATION = "READ_ONLY_VIOLATION"
    MQL_EXECUTION_FAILED = "MQL_EXECUTION_FAILED"
    LLM_HALLUCINATION = "LLM_HALLUCINATION"
    SCHEMA_SAMPLE_FAILED = "SCHEMA_SAMPLE_FAILED"
    MCP_SUBPROCESS_FAILED = "MCP_SUBPROCESS_FAILED"
    UNKNOWN = "UNKNOWN"


class ErrorBody(BaseModel):
    """The ``error`` object inside an ``ErrorResponse`` envelope.

    Per the Zod schema, ``technicalDetails`` and ``isRetryable`` are
    camelCase on the wire; the rest are snake_case.
    """

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    code: ErrorCode
    message: str
    technical_details: str | None = Field(default=None, alias="technicalDetails")
    is_retryable: bool = Field(..., alias="isRetryable")
    guidance: str | None = None


class ErrorResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    error: ErrorBody


# ---------------------------------------------------------------------------
# POST /api/v1/connect
# ---------------------------------------------------------------------------


class ConnectRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    connection_string: str = Field(..., min_length=1)
    acknowledged_risks: list[str] | None = Field(default=None, alias="acknowledgedRisks")


class ConnectStatus(str, Enum):
    PROBING = "probing"
    READY = "ready"
    ERROR = "error"


class ConnectResponse(BaseModel):
    """snake_case on the wire: ``session_token``."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    session_token: str
    status: ConnectStatus
    error: ErrorCardProps | None = None


# ---------------------------------------------------------------------------
# GET /api/v1/probe/{token}
# ---------------------------------------------------------------------------


class SampleStatus(str, Enum):
    PENDING = "pending"
    SAMPLING = "sampling"
    READY = "ready"
    ERROR = "error"


class ProbeResponse(BaseModel):
    """snake_case on the wire."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    collections: int
    database_name: str
    mongo_version: str | None = None
    cluster_tier: str | None = None
    sample_status: SampleStatus


# ---------------------------------------------------------------------------
# GET /api/v1/sample/{token}
# ---------------------------------------------------------------------------


class CollectionSample(BaseModel):
    """snake_case on the wire: ``doc_count``, ``sample_fields``."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    name: str
    doc_count: int
    sample_fields: list[str]


class SampleResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    collections: list[CollectionSample]


# ---------------------------------------------------------------------------
# POST /api/v1/plan
# ---------------------------------------------------------------------------


class ModuleName(str, Enum):
    FUNNEL = "funnel"
    COHORT = "cohort"
    RFM = "rfm"
    ATTRIBUTION = "attribution"
    ANOMALY = "anomaly"


class PlanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    session_token: str = Field(..., min_length=1)
    collections: list[str] = Field(..., min_length=1, max_length=20)
    modules: list[ModuleName] = Field(..., min_length=1, max_length=5)


class PlanStep(BaseModel):
    """One step in a plan. snake_case on the wire."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    module: ModuleName
    collection: str
    mql_pipeline: list[dict]
    estimated_runtime_s: float | None = None


class PlanResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    plan_id: str
    plan: list[PlanStep]


# ---------------------------------------------------------------------------
# POST /api/v1/render (SSE stream)
# ---------------------------------------------------------------------------


class RenderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    session_token: str = Field(..., min_length=1)
    plan_id: str = Field(..., min_length=1)


class RenderProgressData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    completed: int
    total: int


class RenderDoneData(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    plan_id: str


# The SSE event types. The frontend expects an `event:` line that
# matches one of these four names. `data` is JSON-encoded.
RenderEventName = Literal["progress", "card", "error", "done"]


# ---------------------------------------------------------------------------
# GET /api/v1/dashboard
# ---------------------------------------------------------------------------


class LayoutItem(BaseModel):
    """One item in a react-grid-layout — index + position + size."""

    model_config = ConfigDict(extra="forbid")

    i: str
    x: int = Field(..., ge=0)
    y: int = Field(..., ge=0)
    w: int = Field(..., ge=1)
    h: int = Field(..., ge=1)


class DashboardLayout(BaseModel):
    """Per-breakpoint layouts for react-grid-layout."""

    model_config = ConfigDict(extra="forbid")

    lg: list[LayoutItem] = Field(default_factory=list)
    md: list[LayoutItem] = Field(default_factory=list)
    sm: list[LayoutItem] = Field(default_factory=list)
    xs: list[LayoutItem] = Field(default_factory=list)


class DashboardResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    layout: DashboardLayout
    cards: list[CardDescriptor]


# ---------------------------------------------------------------------------
# PUT /api/v1/dashboard/layout
# ---------------------------------------------------------------------------


class LayoutRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    session_token: str = Field(..., min_length=1)
    layout: DashboardLayout


class LayoutResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ok: bool


# ---------------------------------------------------------------------------
# POST /api/v1/cards
# ---------------------------------------------------------------------------


class AddCardRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    session_token: str = Field(..., min_length=1)
    module: ModuleName
    collection: str | None = None
    params: dict | None = None


class AddCardResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    card_id: str
    card: CardDescriptor


# ---------------------------------------------------------------------------
# POST /api/v1/refresh
# ---------------------------------------------------------------------------


class RefreshRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    session_token: str = Field(..., min_length=1)


class RefreshResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    refreshed_count: int
    error_count: int


# ---------------------------------------------------------------------------
# GET /api/v1/health
# ---------------------------------------------------------------------------


class McpSubprocessHealth(BaseModel):
    """camelCase on the wire per Zod: ``mcpSubprocesses``."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    active: int
    max: int


class HealthStatus(str, Enum):
    OK = "ok"
    DEGRADED = "degraded"
    DOWN = "down"


class HealthResponse(BaseModel):
    """Mixed wire format: ``uptime_s`` is snake_case, ``mcp_subprocesses`` is the Python name but the alias is the wire name (Zod uses ``mcpSubprocesses``)."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    status: HealthStatus
    uptime_s: float
    version: str
    mcp_subprocesses: McpSubprocessHealth = Field(..., alias="mcpSubprocesses")


__all__ = [
    # Errors
    "ErrorCode",
    "ErrorBody",
    "ErrorResponse",
    # Connect
    "ConnectRequest",
    "ConnectResponse",
    "ConnectStatus",
    # Probe
    "ProbeResponse",
    "SampleStatus",
    # Sample
    "SampleResponse",
    "CollectionSample",
    # Plan
    "PlanRequest",
    "PlanResponse",
    "PlanStep",
    "ModuleName",
    # Render
    "RenderRequest",
    "RenderProgressData",
    "RenderDoneData",
    "RenderEventName",
    # Dashboard
    "DashboardResponse",
    "DashboardLayout",
    "LayoutItem",
    "LayoutRequest",
    "LayoutResponse",
    # Cards
    "AddCardRequest",
    "AddCardResponse",
    # Refresh
    "RefreshRequest",
    "RefreshResponse",
    # Health
    "HealthResponse",
    "HealthStatus",
    "McpSubprocessHealth",
]
