# Argus — the agentic analyst for MongoDB Atlas

> **Turn a MongoDB connection string into a board, a chat, and a natural-language interface. Three layers of write protection. Works on a $0/month free-tier Atlas cluster.**

Built for the [2026 MongoDB AI Hackathon](https://devpost.com).

[3-box architecture diagram — see `research/08-x15-architecture-diagram.md`]

---

## Repository layout

```
Argus/
├── frontend/         Next.js 15 + Tambo React SDK + the 7 card components
├── backend/          Python FastAPI + mcp_manager + result_set_guard + 5 insight modules
├── shared/           API contract (Zod schemas) shared by both
├── research/         Audit, design decisions, specs (read these first)
├── scripts/          Utility scripts (seed demo data, etc.)
├── docker-compose.yml  Local dev stack
├── .env.example      Environment variable template
└── argus.txt         Original brief (pre-research)
```

The research folder contains the source of truth for every design decision.
The shared folder contains the API contract. The frontend and backend import from shared.

---

## Quick start (local development)

### 1. Clone and configure

```bash
git clone https://github.com/your-org/argus.git
cd argus
cp .env.example .env
# Edit .env: set GEMINI_API_KEY and ARGUS_DEMO_CONNECTION_STRING
```

### 2. Run with Docker Compose

```bash
docker compose up --build
```

This starts:
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8080
- **Backend health:** http://localhost:8080/api/v1/health

### 3. Open the app

1. Go to http://localhost:3000
2. Click "Connect your MongoDB"
3. Paste a connection string (e.g., the seed data connection string)
4. Wait for onboarding (2-3 min)
5. Explore the dashboard, ask questions in chat

### 4. Seed demo data (optional)

```bash
python scripts/seed_demo_data.py --connection-string "$ARGUS_DEMO_CONNECTION_STRING"
```

This creates 3 collections (`users`, `events`, `orders`) with 1,000 / 50,000 / 5,000 documents.

---

## Development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn argus.main:app --reload --port 8080
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Architecture (3 tiers)

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│              │   SSE   │              │   MCP   │              │
│   Vercel     ├────────▶│  Cloud Run   ├────────▶│   MongoDB    │
│  (Next.js)   │  HTTPS  │   (Tambo +   │  HTTP   │   (user's    │
│              │◀────────┤   Gemini)    │◀────────┤   cluster)   │
└──────────────┘         └──────────────┘         └──────────────┘
```

See `research/08-x15-architecture-diagram.md` for the 5-component version.

---

## The 3 layers of write protection

1. **`mongodb-mcp-server` runs in read-only mode** (`MDB_MCP_READ_ONLY=true`).
2. **Recommended read-only database user** during onboarding.
3. **`argus-result-set-guard` blocks `$out` and `$merge`** at the planner layer.

Watch the 3-min video at 0:45 to see what happens when you ask Argus to "drop the users collection."

---

## The 5 insight modules

| Module | What it does | MQL operators |
|---|---|---|
| **Funnel** | Conversion rates between top events. | `$group`, `$facet` |
| **Cohort** | Weekly retention by acquisition week. | `$group`, `$dateTrunc`, `$lookup` |
| **RFM** | Recency-Frequency-Monetary segmentation, 5×5 grid. | `$bucket`, `$densify` |
| **Attribution** | First-touch attribution. (Markov + Shapley in v2.) | `$group`, `$arrayToObject` |
| **Anomaly** | Z-score on daily metrics vs trailing 28-day mean. | `$setWindowFields`, `$stdDevPop` |

See `research/13-mql-examples.md` for the actual pipeline code.

---

## Key documentation

- **Audit findings + decisions:** `research/00-audit-summary.md` through `research/09-v2-plan-outline.md`
- **Implementation specs:** `research/10-readme-draft.md` through `research/20-responsive.md`
- **Backend architecture:** `backend/ARCHITECTURE.md`
- **Original brief:** `argus.txt`

---

## Built With

- **Frontend:** Next.js 15, React 19, Tambo React SDK (`@tambo-ai/react`)
- **Backend:** Python 3.12, FastAPI, Pydantic, asyncio
- **MCP:** mongodb-mcp-server (HTTP transport, sidecar)
- **LLM:** Gemini 3 Flash (primary), with 2-level fallback
- **Database:** MongoDB Atlas (user's data), Memorystore for Redis (session state, v2)
- **Hosting:** Vercel (frontend), Cloud Run (backend)

---

## License

MIT. See `LICENSE` (TBD).

---

Built in 10 days for the 2026 MongoDB AI Hackathon.
