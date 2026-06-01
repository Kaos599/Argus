# Argus Backend — Architecture

**Status:** v1 implementation.
**Audience:** Engineers extending or operating the backend.

This document is the technical reference for the Argus backend. It mirrors the
high-level brief in `../argus.txt` but focuses on internal design: data flow,
component contracts, the MCP subprocess model, the read-only guard, the planner,
and the 5 insight modules.

---

## §1. System overview

Argus is a Python 3.12+ FastAPI service. It accepts a MongoDB connection
string, samples the schema, generates a plan of MQL pipelines, executes them
in a per-tenant subprocess, and streams the resulting insight cards to the
frontend over Server-Sent Events.

**One-line summary:** `FastAPI → LLM planner → per-tenant mcp_manager → read-only mongodb-mcp-server subprocess → SSE stream of CardDescriptors.`

**What Argus is:**
- A read-only analyst for MongoDB Atlas. Every MQL pipeline is validated
  before it touches the database.
- A small, opinionated service: 5 insight modules, 1 LLM call per plan, 1
  in-memory session store. No cron, no message bus, no persistent storage.
- Self-hostable. The Dockerfile includes the mongodb-mcp-server binary.

**What Argus is not:**
- Not a write tool. Three layers of write protection (§5).
- Not a chat framework. There is one planner call per plan.
- Not a hosted SaaS. You run the Docker image.

---

## §2. Component diagram

```
┌────────────────────┐
│  Browser (React)   │
│  /frontend         │
└────────┬───────────┘
         │ HTTP + SSE
         ▼
┌────────────────────────────────────────────────────────────┐
│                    Argus Backend (FastAPI)                 │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ /connect │  │  /plan   │  │ /render  │  │ /dashboard │  │
│  │ /probe   │  │  /health │  │  (SSE)   │  │ /cards     │  │
│  │ /sample  │  │          │  │          │  │ /refresh   │  │
│  │ /events  │  │          │  │          │  │            │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│       │             │             │              │         │
│       ▼             ▼             ▼              ▼         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐  │
│  │  Session │  │  Planner │  │       mcp_manager        │  │
│  │  Store   │  │  (Gemini)│  │  ┌────────────────────┐  │  │
│  │ (memory) │  │  +       │  │  │ result_set_guard   │  │  │
│  │          │  │  fallback│  │  │ + .limit() enforce │  │  │
│  └──────────┘  └──────────┘  │  └────────┬───────────┘  │  │
│                              │           │              │  │
│                              │  ┌────────▼───────────┐  │  │
│                              │  │   per-tenant       │  │  │
│                              │  │   mcp subprocess   │  │  │
│                              │  │  mongodb-mcp-server│  │  │
│                              │  │   --readOnly       │  │  │
│                              │  └────────┬───────────┘  │  │
│                              └───────────┼──────────────┘  │
│                                          │                 │
└──────────────────────────────────────────┼─────────────────┘
                                           ▼
                                ┌──────────────────────┐
                                │   MongoDB Atlas      │
                                │   (read-only user)   │
                                └──────────────────────┘
```

Components are mapped to files in §3.1.

---

## §3. Data flow (per endpoint)

### 3.1 The 11 endpoints

| File                          | Method | Path                          | Purpose                              |
|-------------------------------|--------|-------------------------------|--------------------------------------|
| `api/connect.py`              | POST   | `/api/v1/connect`             | Open a session, return a token       |
| `api/probe.py`                | GET    | `/api/v1/probe/{token}`       | Probe the MCP subprocess liveness    |
| `api/sample.py`               | GET    | `/api/v1/sample/{token}`      | Sample schemas from top collections  |
| `api/plan.py`                 | POST   | `/api/v1/plan`                | LLM-generated execution plan         |
| `api/render.py`               | POST   | `/api/v1/render`              | SSE stream of rendered cards         |
| `api/dashboard.py:get_dashboard` | GET | `/api/v1/dashboard`           | Get saved dashboard (cards + layout) |
| `api/dashboard.py:put_dashboard_layout` | PUT | `/api/v1/dashboard/layout` | Persist a new layout                 |
| `api/dashboard.py:add_card`   | POST   | `/api/v1/cards`               | Add a single card                    |
| `api/refresh.py`              | POST   | `/api/v1/refresh`             | Re-run all MQL pipelines             |
| `api/health.py`               | GET    | `/api/v1/health`              | Liveness + MCP subprocess stats      |
| `api/events.py`               | GET    | `/api/v1/events/stream`       | SSE for live dashboard updates       |

### 3.2 End-to-end example: connect → render

```
1. POST /api/v1/connect
   body: { connection_string: "mongodb://...", database_name?: "..." }
   returns: { session_token, connection_string_redacted, mongo_version, ... }
   - SessionStore.create() generates uuid4-hex token
   - McpManager.touch_subprocess() is called lazily (no subprocess yet)
   - the connection string is stored in the Session and redacted in logs

2. GET /api/v1/probe/{token}
   returns: { sample_status, mongo_version?, collections, ... }
   - if no subprocess, returns sample_status=pending
   - if subprocess is up, asks it to list databases

3. GET /api/v1/sample/{token}
   returns: { collections: [{name, fields, doc_count}] }
   - McpManager.call_tool(token, "mongodb_list_collections", {...})
   - the result is stored on the Session for the planner to read

4. POST /api/v1/plan
   body: { session_token, collections, modules }
   returns: { plan_id, plan: [{module, collection, mql_pipeline, ...}] }
   - Planner.plan(sampled_schema) calls Gemini 3 Flash
   - on Gemini failure, falls back to a deterministic per-module mapping
   - PlanResponse is persisted on the Session

5. POST /api/v1/render
   body: { session_token, plan_id }
   returns: SSE stream of { event: "progress" | "card" | "done" }
   - for each plan step:
       a) result_set_guard.validate_pipeline(pipeline)  # blocks $out/$merge
       b) result_set_guard.enforce_limit(args, 1000)   # caps doc count
       c) mcp.call_tool(token, "mongodb_aggregate", {collection, pipeline})
       d) module.render_card(docs, params) → CardDescriptor
       e) yield event: card with descriptor
   - final event: done with plan_id
```

### 3.3 The request lifecycle

```
HTTP request
  → FastAPI router
    → Depends(get_session_store | get_mcp_manager | get_planner)
      → endpoint handler
        → state.session_store.require(token)        # 404 if missing
          → mcp.call_tool(token, tool_name, args)   # 503 if not initialised
            → result_set_guard.guard_tool_call(...)  # raises on violation
              → mongodb-mcp-server subprocess
                → MongoDB Atlas
```

Every step is fail-fast and returns a typed `ErrorResponse`.

---

## §4. The mcp_manager

The `McpManager` (in `mcp/manager.py`) is the only component that talks to
MongoDB. It owns a per-tenant subprocess pool, lazy-respawns subprocesses,
and reaps idle ones.

### 4.1 Per-tenant subprocess

Each `session_token` gets its own `McpSubprocess` (in `mcp/subprocess.py`)
which wraps a child process running:

```
mongodb-mcp-server \
  --transport http \
  --httpHost 127.0.0.1 \
  --httpPort <unique port> \
  --readOnly
```

The subprocess is spawned on first `call_tool` for that tenant. Subsequent
calls reuse the subprocess. The subprocess is killed after 5 minutes of
inactivity (configurable via `ARGUS_MCP_IDLE_TIMEOUT_S`).

### 4.2 Subprocess pool

`McpManager` keeps at most `ARGUS_MCP_MAX_SUBPROCS` (default 10) subprocesses
alive. If a new tenant arrives and the pool is full, the LRU subprocess is
killed and a new one is spawned. A background reaper runs every 60 seconds
and removes any subprocess that has been idle longer than the timeout.

### 4.3 Connection string

The connection string is per-session. The `SessionStoreConnectionProvider`
(in `mcp/manager.py`) is a `ConnectionStringProvider` Protocol that resolves
a tenant's connection string by reading the Session. The connection string
is injected as the `MDB_MCP_CONNECTION_STRING` env var when the subprocess
is spawned, so the subprocess never sees another tenant's data.

### 4.4 Why subprocess-per-tenant?

The `mongodb-mcp-server` HTTP transport is single-tenant. Sharing one
subprocess across tenants would require either:
- Pooling connection strings inside one subprocess (memory cost: ~1KB/tenant)
- Running one subprocess per request (fork/exec cost: ~50ms)

For the v1 demo (a single user connecting to their own Atlas cluster),
subprocess-per-tenant is the right tradeoff: isolation is total, idle
tenants are evicted by the reaper, and the pool cap prevents runaway
subprocess counts.

---

## §5. The result_set_guard

The `result_set_guard` (in `guard/result_set_guard.py`) enforces read-only
behavior at three levels:

1. **`enforce_limit(args, max=1000)`** — rewrites a `find` or `aggregate`
   args dict to add a `.limit()` (or `$limit` for aggregate). Defaults to
   1000 documents. Returns the args unchanged if no limit is applicable
   (e.g., list_collections).

2. **`validate_pipeline(pipeline)`** — walks the pipeline recursively
   looking for `$out` or `$merge` stages. Raises `GuardViolation` with
   `code=READ_ONLY_VIOLATION` if found, including when nested inside
   `$facet`, `$lookup`, `$unionWith`, or `$graphLookup`.

3. **`redact_connection_string(uri)`** — replaces any password in a
   MongoDB URI with `***`. Used for logging and for the `connect`
   response so the password never escapes the server.

### 5.1 Why three layers?

| Layer                | What it blocks                     | Where it lives                |
|----------------------|------------------------------------|-------------------------------|
| `--readOnly` flag    | All writes at the protocol level   | mcp subprocess                |
| Session-scoped creds | A malicious pipeline can't escape | `McpManager` injection        |
| `result_set_guard`   | `$out`/`$merge` slipped through    | Planner / `/render` validator |

A pipeline that contains `$out` is blocked by the guard before it ever
reaches the subprocess. If a bug let `$out` through, the subprocess would
refuse it because `--readOnly` is set. If a bug let both through, the
connection string points at a read-only database user so MongoDB itself
refuses.

### 5.2 GuardViolation → HTTP

`api/errors.py:guard_violation_to_http` converts a `GuardViolation` to a
4xx HTTPException with the structured `ErrorResponse` envelope.

---

## §6. The planner + scoring

The `Planner` (in `llm/gemini_client.py`) wraps `GeminiClient` with a
fixed system prompt and a JSON-output parser.

### 6.1 The planner call

```
system: PLANNER_SYSTEM_PROMPT
        (lists the 5 modules, their required collections,
         and a JSON shape: {"modules": [{module, collection, params}]})
user:   PLANNER_USER_PROMPT(schema)
        (sampled schema + user-requested modules)
output: {"modules": [{"module": "rfm", "collection": "orders", "params": {}}, ...]}
```

The planner picks 1-3 modules from the user's requested set whose required
collections are present in the sampled schema. The collection is taken
from the user's chosen set (or the planner's suggestion if valid).

### 6.2 Fallback chain

`GeminiClient.generate` walks a model chain:

1. `GEMINI_MODEL_PRIMARY` (default `gemini-1.5-pro`)
2. `GEMINI_MODEL_FALLBACK` (default `gemini-1.5-flash`)
3. `GEMINI_MODEL_LAST_RESORT` (default `gemini-1.0-pro`)

A per-model circuit breaker (default 3 consecutive failures) skips a
model in the chain. If all three fail, the planner returns an empty
plan, and the `/plan` endpoint falls back to a deterministic mapping
(one module per requested collection).

### 6.3 Plan response

```
{
  "plan_id": "<uuid4-hex>",
  "plan": [
    {
      "module": "rfm",
      "collection": "orders",
      "mql_pipeline": [...],
      "estimated_runtime_s": null
    }
  ]
}
```

`plan_id` is stored on the Session; `/render` looks it up to find the
plan steps.

---

## §7. The 5 insight modules

All 5 modules live in `argus/insights/` and follow the `InsightModule`
Protocol (in `insights/base.py`):

```
class InsightModule(Protocol):
    name: ModuleName
    required_collections: list[str]
    cookbook_path: str
    def can_run(self, sampled_schema: dict) -> bool
    def generate_pipeline(self, schema: dict, params: dict) -> list[dict]
    def render_card(self, result: list[dict], params: dict) -> CardDescriptor
```

Each module loads its `*.yaml` cookbook at import time. The cookbook
contains a default pipeline template that the module's `generate_pipeline`
returns after substituting schema-derived placeholders.

### 7.1 Funnel — 7-day activation funnel

- **Input:** a `users` collection (or equivalent event log).
- **Algorithm:** a single `$facet` pipeline that returns 4 arrays
  (signups, activations, revenue, by_country) in one round-trip.
- **Output card:** `SummaryCard` with 3 KPI tiles (signups, activations,
  revenue) + a related `BarChartCard` of the top 10 countries by signup.
- **Why:** shows the user a 30,000-ft view of acquisition + monetization
  in one card.

### 7.2 Cohort — retention heatmap

- **Input:** a `users` collection (or any collection with a `signup_date`
  field).
- **Algorithm:** buckets users by days-since-signup (0, 1, 7, 14, 30, 60,
  90) and emits a user count per bucket.
- **Output card:** `HeatmapCard` (2 rows × 7 columns: "All acquisitions"
  + "Total" by bucket).
- **Why:** retention is the most-requested SaaS insight; heatmap is
  the most familiar visualization for it.

### 7.3 RFM — recency/frequency/monetary segmentation

- **Input:** an `orders` collection with `created_at`, `user_id`, `amount`.
- **Algorithm:** a `$bucket` pipeline on a composite score (recency in
  days, frequency = order count, monetary = total spend) and emits a
  bucket label + user count per bucket.
- **Output card:** `BarChartCard` with the bucket range as label and
  user count as value.
- **Why:** the classic segmentation for SaaS / e-commerce, and the
  composite-score approach is fast on a free M0.

### 7.4 Attribution — first-touch marketing attribution

- **Input:** a `events` collection with `utm_source` / `referrer` and
  a `users` collection with `signup_date`.
- **Algorithm:** joins events to users by `user_id`, picks the earliest
  `utm_source` per user, groups by source.
- **Output card:** `BarChartCard` with the channel as label and the
  signup count as value.
- **Why:** marketers need this on day 1. v2 will add Markov + Shapley.

### 7.5 Anomaly — z-score spike detection

- **Input:** any time-series collection (e.g. daily `orders.created_at`
  count).
- **Algorithm:** computes the mean and std-dev of the trailing 28 days,
  flags any point where `|value - mean| / stddev > 3`.
- **Output card:** `TimeSeriesCard` with the full series. If anomalies
  are found, wraps in a `SummaryCard` whose `findings` list names the
  anomalous dates.
- **Why:** anomalies are the most actionable thing a board can show.

---

## §8. The card_renderer

`argus/insights/card_renderer.py` is the registry of insight modules.
It exposes:

- `all_modules() -> list[InsightModule]` — all registered modules.
- `get_module(name: ModuleName) -> InsightModule` — single-module
  lookup, raises `KeyError` if not registered.
- `render_error(message, **kwargs) -> CardDescriptor` — emit a
  `ErrorCard` so the dashboard can show partial results when one
  module fails.

Adding a new module is a 3-step recipe:

1. Write a `cookbook/*.yaml` with the default pipeline template.
2. Implement the `InsightModule` Protocol in a new `insights/foo.py`.
3. Register it in `card_renderer._MODULES`.

---

## §9. The model_router + fallback chain

See §6.2. `GeminiClient` is the only place that touches the Gemini SDK.
The rest of the codebase depends on the `Planner` Protocol, which can be
swapped for any LLM that returns the right JSON shape.

The model chain is configured via env vars (see `config.py`):

```
GEMINI_MODEL_PRIMARY=gemini-1.5-pro
GEMINI_MODEL_FALLBACK=gemini-1.5-flash
GEMINI_MODEL_LAST_RESORT=gemini-1.0-pro
```

A model is "skipped" if it has failed 3 times in a row in this process.
The skip is in-memory and resets on process restart.

---

## §10. State management

There are two pieces of state:

1. **`SessionStore`** (in `state/session_store.py`) — an in-memory
   `dict[token → Session]`. `Session` carries the connection string,
   the sampled schema, the dashboard cards, and the plans. TTL is 24h
   (configurable via `ARGUS_SESSION_TTL_S`). Eviction is lazy on
   `get(token)`.

2. **`McpManager`** — the subprocess pool described in §4.

There is no persistent storage in v1. Restarting the process loses all
sessions; that is acceptable for the demo.

### 10.1 Error model

All errors are returned as `ErrorResponse`:

```
{
  "error": {
    "code": "READ_ONLY_VIOLATION",
    "message": "Pipeline contains forbidden stage '$out'",
    "technicalDetails": "...",
    "isRetryable": false,
    "guidance": "..."
  }
}
```

`code` is an `ErrorCode` enum: `UNKNOWN`, `INVALID_INPUT`,
`MQL_EXECUTION_FAILED`, `READ_ONLY_VIOLATION`, `LLM_HALLUCINATION`,
`MCP_UNAVAILABLE`, `SESSION_EXPIRED`, `RATE_LIMITED`, `INTERNAL_ERROR`.

---

## §11. Cloud Run deployment

```yaml
# cloud-run-service.yaml (sketch)
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: argus-backend
spec:
  template:
    spec:
      containerConcurrency: 1   # one tenant per instance
      containers:
        - image: gcr.io/argus-2026/argus-backend:latest
          resources:
            limits:
              memory: 1Gi
              cpu: "1"
          env:
            - name: GEMINI_API_KEY
              valueFrom: { secretKeyRef: { name: gemini, key: api_key } }
            - name: ARGUS_LOG_LEVEL
              value: INFO
      timeoutSeconds: 300
  traffic:
    - percent: 100
      latestRevision: true
```

**Egress:** per `research/03-x13-cloud-run-egress.md`, the v1 deploy uses
**Option A** (egress via the default internet). Option B (Serverless VPC
Access + Private Service Connect to Atlas) is the upgrade path if egress
becomes a billing or security concern.

**min-instances=1** keeps at least one warm instance to avoid cold-start
spikes. The `/health` endpoint is called by Cloud Run's health checker.

---

## §12. Observability

- **Cloud Logging:** `argus.main` configures structured JSON logs. Every
  log line carries `tenant_id` (the session token prefix), `event`, and
  `duration_ms` where applicable.
- **Cloud Trace:** not enabled in v1. The `GeminiClient` records timings
  in a `prometheus_client` `Histogram` (optional, off by default).
- **LangSmith:** not used in v1. The planner call could be wrapped with
  `langsmith.trace` if the team wants eval data.

Connection strings are always redacted via `redact_connection_string`
before they hit a log line.

---

## §13. Local development

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Configure
cp ../.env.example .env
$EDITOR .env   # set GEMINI_API_KEY

# Run
uvicorn argus.main:app --reload --port 8000

# Test
pytest                  # 72 tests
ruff check argus/ tests/

# OpenAPI
open http://127.0.0.1:8000/docs
```

You can connect to a local MongoDB (e.g. via `docker run -d -p 27017:27017 mongo`)
or to an Atlas free-tier M0 cluster.

---

## §14. Testing strategy

72 tests across 3 files:

| File                       | Count | What it covers                                          |
|----------------------------|-------|---------------------------------------------------------|
| `tests/test_guard.py`      | 25    | `redact_connection_string`, `enforce_limit`, `validate_pipeline` |
| `tests/test_insights.py`   | 31    | cookbook loading, `can_run`, `render_card` for all 5 modules |
| `tests/test_api.py`        | 16    | All 11 endpoints, with a mock `McpManager` and in-memory `SessionStore` |

The API tests use `MockMcpManager` and `MockPlanner` (in `conftest.py`)
so no real MongoDB or Gemini is needed. The `wired_app` fixture injects
the mocks into the module-level singletons before the FastAPI lifespan
runs.

### 14.1 What is not tested

- `McpManager` (the real subprocess lifecycle) — exercised only via the
  mock. Manual smoke test required.
- `GeminiClient` (the real API) — requires a `GEMINI_API_KEY` and is
  exercised in the demo video, not in CI.
- `result_set_guard.guard_tool_call` — partial; the validation paths are
  covered, but the orchestration with the MCP layer is mocked.

These gaps are acceptable for the v1 demo; a v2 should add a `pytest`
integration test that runs against a Dockerised MongoDB.

---

## Appendix A: file map

```
argus/
├── __init__.py                   # re-exports `app` for `python -c "from argus.main import app"`
├── main.py                       # FastAPI app, lifespan, CORS, router registration
├── config.py                     # Settings dataclass (env-driven)
├── api/
│   ├── connect.py                # POST /api/v1/connect
│   ├── probe.py                  # GET /api/v1/probe/{token}
│   ├── sample.py                 # GET /api/v1/sample/{token}
│   ├── plan.py                   # POST /api/v1/plan
│   ├── render.py                 # POST /api/v1/render (SSE)
│   ├── dashboard.py              # GET /dashboard, PUT /layout, POST /cards
│   ├── refresh.py                # POST /api/v1/refresh
│   ├── health.py                 # GET /api/v1/health
│   ├── events.py                 # GET /api/v1/events/stream (SSE)
│   ├── dependencies.py           # Singletons + dependency getters
│   └── errors.py                 # GuardViolation → HTTPException
├── mcp/
│   ├── manager.py                # McpManager, ConnectionStringProvider Protocol
│   └── subprocess.py             # McpSubprocess, spawn_subprocess, port allocator
├── guard/
│   └── result_set_guard.py       # redact_connection_string, validate_pipeline, enforce_limit
├── state/
│   └── session_store.py          # SessionStore, Session dataclass
├── insights/
│   ├── base.py                   # InsightModule Protocol, load_cookbook
│   ├── funnel.py                 # FunnelModule
│   ├── cohort.py                 # CohortModule
│   ├── rfm.py                    # RfmModule
│   ├── attribution.py            # AttributionModule
│   ├── anomaly.py                # AnomalyModule
│   ├── card_renderer.py          # all_modules, get_module, render_error
│   └── cookbook/
│       ├── funnel.yaml
│       ├── cohort.yaml
│       ├── rfm.yaml
│       ├── attribution.yaml
│       └── anomaly.yaml
├── llm/
│   ├── prompts.py                # PLANNER_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT
│   └── gemini_client.py          # GeminiClient, Planner, _parse_planner_json
└── models/
    ├── api_types.py              # 11 endpoint request/response models, ErrorCode enum
    └── card.py                   # 7 card prop models, CardDescriptor, CardName enum

tests/
├── conftest.py                   # MockMcpManager, MockGeminiClient, MockPlanner, fixtures
├── test_guard.py                 # 25 tests
├── test_insights.py              # 31 tests
└── test_api.py                   # 16 tests
```
