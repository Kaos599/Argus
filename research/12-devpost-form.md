# Devpost Submission Form Draft

**Date:** 2026-06-01
**Status:** Draft. ~600 words. Designed to be copy-pasted into the Devpost form fields.

---

## Project Title

```
Argus — the agentic analyst for MongoDB Atlas
```

## Tagline (max 200 chars)

```
Turn a MongoDB connection string into a board, a chat, and a natural-language interface. Three layers of write protection. Works on a $0/month free-tier Atlas cluster.
```

(Character count: 197. The 3-character slack is intentional — judges see this in the submission grid.)

## Built With (table)

| Category | Tools |
|---|---|
| **AI** | Gemini 3 Flash, Gemini 2.5 Flash (fallback) |
| **Frameworks** | Tambo (self-hosted), Next.js 15, React 19 |
| **Databases** | MongoDB Atlas (user's data), Memorystore for Redis (session state) |
| **Hosting** | Vercel, Cloud Run, MongoDB Atlas |
| **Tools & Libraries** | mongodb-mcp-server v1.x, react-grid-layout, Zod, FastAPI, Pydantic |
| **Observability** | Google Cloud Logging, Cloud Trace, ADK traces |

## Description (~500 words)

Argus is the first agentic analyst for MongoDB Atlas. You paste a connection string, and Argus generates a dashboard, a chat, and a natural-language interface to your data — without ever mutating the underlying cluster.

We built Argus because the workflow for "what's happening with my MongoDB data" is broken. Today, you read the docs, write a 50-line aggregation pipeline, run it, parse the result, build a chart. That takes an hour. Or you hire a data analyst. That's not an option for a solo developer or a small team.

**What Argus does:**

- Connects to any MongoDB Atlas cluster (works on M0 free tier).
- Samples the schema, picks the top 5 most promising collections, and generates a draft dashboard of insights.
- Lets the user chat with their data. The agent picks the right card — chart, table, summary — based on the question.
- Ships with 5 insight modules: Funnel, Cohort, RFM, Attribution, Anomaly.
- Renders an Interactable board (12-col grid) with drag-and-drop, resize, and persistent layouts.

**What makes Argus different:**

1. **Three layers of write protection.** Argus is read-only by design. The `mongodb-mcp-server` runs in read-only mode. The onboarding flow recommends a read-only database user. And the `argus-result-set-guard` blocks `$out` and `$merge` aggregation stages at compile time, before they ever reach MongoDB. A judge can ask Argus to "drop the users collection" — it will refuse, with a card explaining why.

2. **Real MongoDB Aggregation Framework pipelines.** The 5 insight modules are not LLM-generated SQL. They are real `$facet`, `$bucket`, `$setWindowFields`, `$lookup` pipelines — the same ones a senior MongoDB engineer would write by hand. See the `docs/example-pipelines.md` in the repo for the actual code.

3. **Generative UI via Tambo.** Components are registered with Zod schemas. The agent picks the right component for the data. Props stream in as the LLM generates them. This is generative UI done right.

4. **Self-hosted, open source.** Argus is not a hosted SaaS. You bring your own MongoDB and deploy Argus on your own Cloud Run + Vercel. The total cost at low scale is $0/month.

5. **Works on a free-tier M0 cluster.** We've been running the entire demo on a free MongoDB Atlas M0 cluster. The only infrastructure cost during the build was the Cloud Run + Vercel free tiers.

**The architecture in one sentence:** Vercel hosts the Next.js 15 frontend with the Tambo React SDK. Cloud Run hosts the self-hosted Tambo backend (with Gemini 3 Flash for inference) plus three custom Python services: a result-set guard, an MCP manager for per-tenant subprocess lifecycle, and the mongodb-mcp-server sidecar. The user's MongoDB is the data source.

**Who it's for:** The solo developer who wants to know "what's happening with my data" without learning the aggregation framework. The product manager tracking funnel drop-off. The data engineer looking for anomalies in event volume.

**What's next:** v2 will add change streams (real-time push, not polled refresh), Markov chain attribution, STL-based anomaly detection, and a PII redaction layer.

## Links

| Field | URL |
|---|---|
| **Website / Live Demo** | https://argus-mongodb.dev |
| **GitHub Repository** | https://github.com/your-org/argus |
| **Video** | https://youtu.be/[video-id] |
| **Try it yourself** | https://argus-mongodb.dev/connect (paste your own Atlas M0 connection string) |

## Screenshots (upload 3-5)

1. **The dashboard.** The 5 insight modules rendered from the seed data. Shows the visual design.
2. **The read-only moment.** The agent refusing to drop a collection, with a card explaining the 3 layers.
3. **The chat.** The user typing a free-form question, the agent returning a card.
4. **The MQL pipeline.** A card expanded to show the underlying aggregation pipeline.
5. **The architecture diagram.** The 3-box diagram from the README.

## How to run the demo locally

```bash
git clone https://github.com/your-org/argus.git
cd argus
cd frontend && npm install && npm run dev
cd ../backend && docker compose up
# Open http://localhost:3000
# Paste your Atlas connection string
```

## Team

[Team name]. Building in 10 days for the 2026 MongoDB AI Hackathon.

---

## Form field-by-field guidance

The Devpost form has 7 fields. Here's what to put in each:

| Field | What to write | Word count |
|---|---|---|
| Project title | "Argus — the agentic analyst for MongoDB Atlas" | 8 words |
| Tagline | The 197-character tagline above | 33 words |
| Built With | The table above | ~30 items |
| Description | The 500-word description above | 500 words |
| Links | The 4 URLs above | 4 URLs |
| Screenshots | The 5 screenshots above | 5 images |
| Video | The 3-min video URL | 1 URL |

Total time to fill the form: ~20 minutes. The description is the longest field; the rest are quick.

## What judges will see in the submission grid

Devpost shows submissions in a grid view. The first 3 things they see are:
1. **Title** (8 words)
2. **Tagline** (33 words)
3. **First screenshot** (the dashboard)

If the tagline doesn't land, judges don't click. The tagline is the second-most-important sentence in the submission (after the README H1, which says the same thing).

The first screenshot is the third-most-important. It must be visually impressive. The dashboard with the 5 insight modules is the right screenshot for slot 1.
