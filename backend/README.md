# Argus Backend

A Python 3.12+ FastAPI service that turns natural-language questions about a
MongoDB Atlas database into read-only MQL pipelines, runs them in a per-tenant
sandbox, and streams insight cards to the frontend.

The frontend lives at `../frontend/`. The shared TypeScript API types live at
`../shared/api-types.ts` and are mirrored 1:1 in `argus/models/`.

## Quick start

```bash
# 1. Set up the venv (Python 3.12+ recommended).
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# 2. Configure environment.
cp ../.env.example .env   # then fill in GEMINI_API_KEY etc.

# 3. Run the dev server.
uvicorn argus.main:app --reload --port 8000

# 4. Hit it.
curl http://127.0.0.1:8000/api/v1/health
```

OpenAPI docs are at `http://127.0.0.1:8000/docs`.

## Endpoints

11 endpoints, all under `/api/v1/`. See `ARCHITECTURE.md` for full details.

| Method | Path                                | Purpose                                 |
|--------|-------------------------------------|-----------------------------------------|
| POST   | `/connect`                          | Open a session, return a token          |
| GET    | `/probe/{token}`                    | Liveness probe of the MCP subprocess    |
| GET    | `/sample/{token}`                   | Sample schemas from top collections     |
| POST   | `/plan`                             | LLM-generated execution plan            |
| POST   | `/render`                           | SSE stream of rendered cards            |
| GET    | `/dashboard`                        | Get saved dashboard (cards + layout)    |
| PUT    | `/dashboard/layout`                 | Persist a new layout                    |
| POST   | `/cards`                            | Add a single card                       |
| POST   | `/refresh`                          | Re-run all MQL pipelines                |
| GET    | `/health`                           | Liveness + MCP subprocess stats         |
| GET    | `/events/stream`                    | SSE for live dashboard updates          |

## Architecture

Three layers of write-protection are enforced on every MQL call:

1. **`--readOnly` flag** is passed to the `mongodb-mcp-server` subprocess.
2. **Session-store-scoped connection string** is injected per tenant; the
   subprocess never sees a write-privileged URL.
3. **`result_set_guard`** rejects any pipeline containing `$out` or `$merge`
   (including nested inside `$facet`, `$lookup`, etc.) and caps returned
   document counts.

See `ARCHITECTURE.md` for the full design (modules, lifecycle, error model,
threat model, scaling notes).

## Modules

`argus/insights/` ships five insight modules backed by YAML cookbooks:

- `funnel` — 7-day activation funnel (3 KPIs + top countries)
- `cohort` — retention heatmap by days since signup
- `rfm` — recency/frequency buckets
- `attribution` — first-touch marketing attribution
- `anomaly` — z-score spike detection on a time series

Adding a new module is a 3-step recipe: write a `*.yaml` cookbook, implement
the module, register it in `card_renderer.py`.

## Testing

```bash
pytest                       # 72 tests, ~0.1s
pytest tests/test_api.py -v  # just the API layer
ruff check argus/ tests/     # lint
```

Tests use an in-memory `SessionStore` and a `MockMcpManager` so no real
MongoDB is required.

## Docker

```bash
docker build -t argus-backend .
docker run --rm -p 8000:8000 \
  -e GEMINI_API_KEY=... \
  -e ARGUS_DEFAULT_DB=my_db \
  argus-backend
```

The image installs `mongodb-mcp-server@${MCP_SERVER_VERSION}` globally and
runs the API on port 8000 as a non-root user.

## Configuration

All settings are read from environment variables (and optionally a `.env`
file). See `argus/config.py` for the canonical list. The most common ones:

| Variable                  | Default       | Notes                                      |
|---------------------------|---------------|--------------------------------------------|
| `ARGUS_LOG_LEVEL`         | `INFO`        | DEBUG/INFO/WARNING/ERROR                   |
| `ARGUS_MCP_MAX_SUBPROCS`  | `10`          | Per-tenant subprocess pool cap             |
| `ARGUS_MCP_IDLE_TIMEOUT_S`| `300`         | Idle subprocess TTL                        |
| `ARGUS_SESSION_TTL_S`     | `86400`       | 24h session TTL                             |
| `ARGUS_DEFAULT_DB`        | `sample_db`   | Default DB if user doesn't pick one        |
| `ARGUS_VERSION`           | `0.1.0`       | Shown in /health response                  |
| `GEMINI_API_KEY`          | (required)    | For LLM planning                            |
| `GEMINI_MODEL_PRIMARY`    | `gemini-1.5-pro` | Primary Gemini model                    |
| `MONGODB_MCP_SERVER_VERSION` | `1.2.3`    | Pinned in Dockerfile                       |
| `MDB_MCP_READ_ONLY`       | `true`        | Mirror of the subprocess flag              |

## Out of scope (v1)

- Frontend (in `../frontend/`)
- Auth (per `07-risk-acknowledgments.md` X8)
- Cron-based refresh (manual `/refresh` only)
- Persistent dashboard storage (sessions are in-memory, 24h TTL)
- More than 5 insight modules
