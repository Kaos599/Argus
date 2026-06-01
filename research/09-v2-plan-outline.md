# v2 Plan Outline

**Date:** 2026-06-01
**Status:** Outline. The full v2 plan rewrites `argus.txt` and `backend/ARCHITECTURE.md` end-to-end. This file is the table of contents.

---

## v2 Plan Structure

The v2 plan lives in two files (rewriting the originals) plus a `research/` directory (this directory, already populated) plus new top-level files for the submission artifacts.

```
Argus/
├── argus.txt                              [REWRITTEN] — the brief
├── backend/
│   └── ARCHITECTURE.md                    [REWRITTEN] — internal design
├── research/                              [NEW, already populated]
│   ├── 00-audit-summary.md                ✓ done
│   ├── 01-user-decisions.md               ✓ done
│   ├── 02-x2-name-strategy.md             ✓ done
│   ├── 03-x13-cloud-run-egress.md         ✓ done
│   ├── 04-x14-tambo-mcp.md                ✓ done
│   ├── 05-x16-positioning.md              ✓ done
│   ├── 06-x1-mcp-scope.md                 ✓ done
│   ├── 07-risk-acknowledgments.md         ✓ done
│   ├── 08-x15-architecture-diagram.md     ✓ done
│   ├── 09-v2-plan-outline.md              ← this file
│   ├── 10-readme-draft.md                 [TODO]
│   ├── 11-video-script.md                 [TODO]
│   ├── 12-devpost-form.md                 [TODO]
│   ├── 13-mql-examples.md                 [TODO]
│   ├── 14-zod-schemas.md                  [TODO]
│   ├── 15-routes.md                       [TODO]
│   ├── 16-known-limitations.md            [TODO]
│   ├── 17-theming.md                      [TODO]
│   ├── 18-video-storyboard.md             [TODO]
│   ├── 19-error-states.md                 [TODO]
│   └── 20-responsive.md                   [TODO]
├── README.md                              [NEW] — for the GitHub repo
├── docs/
│   ├── example-pipelines.md               [NEW] — MQL examples for the README
│   └── production-deployment.md           [NEW] — Appendix C
└── scripts/
    └── seed_demo_data.py                  [NEW] — for the demo video
```

---

## `argus.txt` (rewritten) — Table of Contents

The brief is the team's internal document. The v2 rewrite should:

1. **Reconcile the MCP subprocess contradiction.** Per `06-x1-mcp-scope.md`.
2. **Remove `$merge` from the spec.** Add the `result_set_guard` design. Per audit X6.
3. **Replace `atlas-get-performance-advisor` with M0-compatible tools.** Per audit X5.
4. **Lock the embedding model to `gemini-embedding-2`.** Per audit.
5. **Document the 5 insight modules with v1-specific definitions.** Per `07-risk-acknowledgments.md` (X4).
6. **Document the per-tenant subprocess design with code-level detail.** Per `06-x1-mcp-scope.md`.
7. **Keep all Blaze references and use cases.** Per user decision.
8. **Document the X13 Cloud Run egress decision** (Option A by default, with Option B upgrade path). Per `03-x13-cloud-run-egress.md`.
9. **Document the X14 Tambo + mongodb-mcp-server architecture.** Per `04-x14-tambo-mcp.md`.
10. **Note that PII layer and API auth are not in scope.** Per `07-risk-acknowledgments.md`.

Sections:

```
§1. Product overview
   1.1 What Argus is (one paragraph)
   1.2 What Argus is not (one paragraph)
   1.3 Use cases (5 Blaze-shaped use cases, kept per user decision)
   1.4 The 5 insight modules (v1-specific definitions)
   1.5 The 3 layers of write protection
   1.6 Why Atlas M0 matters (the "$0/month free tier" claim)

§2. Architecture
   2.1 The 3-box diagram (cross-reference research/08-x15-architecture-diagram.md)
   2.2 Component inventory
   2.3 Data flow (one end-to-end example)

§3. Backend
   3.1 The mcp_manager (Python) — per `06-x1-mcp-scope.md`
   3.2 The result_set_guard (Python) — $out/$merge block, .limit() enforcement
   3.3 The planner LLM call (Gemini 3 Flash, with fallback chain)
   3.4 The 5 insight modules (Funnel, Cohort, RFM, Attribution, Anomaly)
   3.5 The insight scoring (MDSF-style; correct the formula)
   3.6 The card_renderer (emits Zod-typed card props)
   3.7 The model_router (Gemini fallback chain)
   3.8 Cloud Run deployment (with min-instances: 1, /healthz pinger)
   3.9 Connection string handling (per-session, env var, never in logs)
   3.10 Removed items: $merge, atlas-get-performance-advisor

§4. Frontend (currently empty in argus.txt — fleshed out in v2)
   4.1 The 5 routes (per `15-routes.md`)
   4.2 The 7 Zod card schemas (per `14-zod-schemas.md`)
   4.3 The Tambo integration (per `04-x14-tambo-mcp.md`)
   4.4 The 12-col Interactable board
   4.5 The chat interface with streaming
   4.6 The 5-step onboarding flow

§5. Operational
   5.1 Egress strategy (per `03-x13-cloud-run-egress.md`)
   5.2 Health checks, pinger, warm-up
   5.3 Demo data seed script
   5.4 Demo reset button
   5.5 System status pill
   5.6 Cost model and budget
   5.7 Cloud Run service config (min-instances, memory, concurrency)

§6. Submission artifacts (new section)
   6.1 README — `10-readme-draft.md` (or `README.md` directly)
   6.2 Devpost form — `12-devpost-form.md`
   6.3 3-min video script — `11-video-script.md`, `18-video-storyboard.md`
   6.4 Architecture diagram — `08-x15-architecture-diagram.md`
   6.5 MQL examples — `13-mql-examples.md`

§7. Known limitations — `16-known-limitations.md`
§8. Out of scope (per user decisions)
   8.1 PII layer
   8.2 API auth
   8.3 GCP credit form
   8.4 Rename from "Argus"
§9. Risks register (consolidated, 1-line each)
§10. Open questions (1-line each, with owner)
```

---

## `backend/ARCHITECTURE.md` (rewritten) — Table of Contents

This is the technical reference for the backend. The v2 rewrite should be a sister document to the new argus.txt, focused on internal design.

```
§1. System overview
§2. Component diagram (per research/08)
§3. Data flow (per-endpoint, with examples)
§4. The mcp_manager (per research/06)
§5. The result_set_guard
§6. The planner + scoring
§7. The insight modules (5 modules, each with: input, algorithm, output card)
§8. The card_renderer
§9. The model_router + fallback chain
§10. State management
§11. Cloud Run deployment (Cloud Build, Artifact Registry, IAM)
§12. Observability (Cloud Logging, Cloud Trace, ADK traces)
§13. Local development
§14. Testing strategy
```

---

## `README.md` (new) — Structure

Per `10-readme-draft.md` (TODO).

```
# Argus — the agentic analyst for MongoDB Atlas

[Tagline: 1 sentence]

[3-box architecture diagram, Mermaid]

## Read-only by default (3 layers)
## 5-step onboarding (5 screenshots)
## 5 insight modules (5 screenshots)
## How we built it
## Potential Impact
## Built With
## MQL pipeline examples (per research/13)
## Known limitations (per research/16)
## Appendix A: Local development
## Appendix B: Demo data
## Appendix C: Production deployment (per research/03)
```

---

## `docs/example-pipelines.md` (new) — 3 MQL Examples

Per `13-mql-examples.md` (TODO).

1. **`$facet` for multi-metric cohort analysis.** A pipeline that returns signups, activations, and revenue for the last 7 days, in a single round-trip.
2. **`$bucket` for revenue segmentation.** A pipeline that segments users into 5 revenue buckets, with a count and total per bucket.
3. **`$setWindowFields` for rolling retention.** A pipeline that computes 7-day rolling retention by acquisition cohort.

Each example: 15-20 lines of MQL, 1 paragraph of explanation, 1 line of what card it powers.

---

## `scripts/seed_demo_data.py` (new)

Generates a realistic dataset for the demo video and the README screenshots.

- **3 collections:** `users`, `events`, `orders`.
- **Volume:** 1,000 users, 50,000 events, 5,000 orders. Small enough to load into a free M0 cluster, large enough to make the visualizations look real.
- **Schema:** Realistic for a SaaS app. `users` has email, signup_date, country. `events` has user_id, event_type, timestamp. `orders` has user_id, amount, status, created_at.
- **Insight-friendly:** RFM-friendly (orders have recency, frequency, monetary). Funnel-friendly (events have types: `signup`, `verify_email`, `first_purchase`). Cohort-friendly (signup_date, then activity over time).

This data is for the demo and the README, not for the user's own MongoDB. The user connects their own data via `/connect`.

---

## New argus.txt opening (drafted, ready to insert)

The current `argus.txt` opens with a project overview. The v2 opening should be tighter, more focused, and lead with the differentiation.

> # Argus — the agentic analyst for MongoDB Atlas
>
> Argus turns a MongoDB connection string into a board, a chat, and a natural-language interface. The first agentic analyst for MongoDB Atlas that ships with three layers of write protection and works on a $0/month free-tier cluster.
>
> **Built for the 2026 MongoDB AI Hackathon. Submitted by [team].**
>
> ## What it is
>
> Argus connects to a MongoDB Atlas cluster, samples the schema, generates a draft dashboard of insights, and lets the user chat with their data. Every operation is read-only. The user can ask questions in natural language, and the agent renders the right visualization as a card.
>
> ## What it isn't
>
> - Not a general-purpose chatbot. Argus is specifically for MongoDB Atlas.
> - Not a write tool. Argus is read-only by design. Three layers of write protection.
> - Not a hosted SaaS. Argus is a self-hosted open-source project. You bring your own MongoDB.
>
> ## The 5 insight modules
>
> - **Funnel:** Conversion rates between top events.
> - **Cohort:** Weekly retention by acquisition week.
> - **RFM:** Recency-Frequency-Monetary segmentation, 5x5 grid.
> - **Attribution:** First-touch attribution. (Markov + Shapley in v2.)
> - **Anomaly:** Z-score on daily metrics vs trailing 28-day mean.
>
> ## The 3 layers of write protection
>
> 1. The `mongodb-mcp-server` runs in read-only mode (`MDB_MCP_READ_ONLY=true`).
> 2. The connection string is for a read-only database user (recommended in onboarding).
> 3. The `argus-result-set-guard` blocks `$out` and `$merge` stages at the planner layer, before they reach MongoDB.

This is the new "first 30 seconds" of the brief. It mirrors the README H1. It anchors the differentiation. It is not a feature list.

---

## Open questions for the team

These need answers before the v2 plan is locked:

1. **D1 spike on Tambo + mongodb-mcp-server HTTP transport.** Per `04-x14-tambo-mcp.md`. If this fails, the architecture changes.
2. **Which Gemini model exactly?** `gemini-3-flash-preview` is the recommendation. Confirm.
3. **What is the team actually committing to ship?** The 5 modules? The dashboard? The chat? All of it? Per user: yes, all of it.
4. **Who owns what?** Roles are deferred per user decision, but the work is real. The team needs to coordinate.
5. **Demo data shape:** Blaze-shaped (per user) or neutral? User said "strip completely" but later said "we don't need to care about X9 and X3 is fine." This is ambiguous. Re-confirm in the v2 rewrite.

---

## Acceptance criteria for the v2 plan

The v2 plan is "done" when:

1. `argus.txt` is rewritten with the TOC above.
2. `backend/ARCHITECTURE.md` is rewritten with the TOC above.
3. The Mermaid diagrams from `08-x15-architecture-diagram.md` are embedded in the README and ARCHITECTURE.md.
4. The 5 insight modules have v1-specific definitions.
5. The 3 layers of write protection are documented in both files.
6. The MCP subprocess design (per `06-x1-mcp-scope.md`) is documented.
7. The Tambo + mongodb-mcp-server architecture (per `04-x14-tambo-mcp.md`) is documented.
8. The 5 routes (per `15-routes.md`) are specified.
9. The 7 Zod schemas (per `14-zod-schemas.md`) are drafted.
10. The "Out of scope" section (per `07-risk-acknowledgments.md`) is in §8.

The other research/ files (`10-readme-draft.md` through `20-responsive.md`) are submission artifacts and can be drafted in parallel with the v2 plan.
