# 3-Minute Video Storyboard

**Date:** 2026-06-01
**Status:** Draft. 15-row table with time codes, shots, narration, on-screen action, and fallbacks. This is the spreadsheet version of `11-video-script.md`.

---

## The storyboard

| Time | Shot | Narration (verbatim) | On-screen action | Fallback if demo dies |
|---|---|---|---|---|
| 0:00 | Title card | *(silence)* | Plain text: "Argus. The agentic analyst for MongoDB Atlas." | n/a |
| 0:15 | B-roll / diagram | "If you've ever asked MongoDB 'what's happening with my data,' you know the answer is: read the docs, write a 50-line aggregation pipeline, run it, parse the result, build a chart. That takes an hour. Or you hire a data analyst. That's not an option for a solo developer." | Stock footage of a confused person at a computer, or a simple diagram of a MongoDB cluster → 200-line pipeline. | Use a static screenshot of a 200-line pipeline. |
| 0:30 | Live demo: `/connect` | "Argus is the first agentic analyst for MongoDB Atlas. You paste a connection string. Argus probes the cluster, samples the schema, and generates a draft dashboard of insights. Two to three minutes from paste to first dashboard. Watch." | Browser at `/connect`. Paste a connection string. Click Connect. | Show a pre-recorded screen capture of this moment. |
| 0:45 | Live demo: chat → "drop the users collection" | "Here's a question you might ask an agent: 'drop the users collection.' Watch what happens." | Type the message. Agent refuses with a card. | (Fallback A in `11-video-script.md`) |
| 0:55 | Live demo: read-only card | "Argus shipped with three layers of write protection. The MCP server runs in read-only mode. We recommend connecting with a read-only database user. And the planner layer blocks $out and $merge stages at compile time, before they ever reach MongoDB." | The card showing the 3 layers is visible. Hover over each layer. | n/a (the card is already rendered) |
| 1:00 | Live demo: 5 insight modules | "Argus ships with five insight modules: Funnel, Cohort, RFM, Attribution, and Anomaly. Each is generated from your schema and run as a MongoDB aggregation pipeline. Let me show you one." | The dashboard is rendered with 5 cards. Click on Funnel. | (Fallback B in `11-video-script.md`) |
| 1:15 | Live demo: Funnel card expanded | "This is a real MongoDB Aggregation Framework pipeline — $group, $facet, $bucket. The same pipeline a senior MongoDB engineer would write by hand, but generated in two seconds." | The Funnel card expands to show the pipeline. | n/a |
| 1:30 | Live demo: scroll through other 4 modules | *(no narration, just background music)* | Quick scroll: Cohort, RFM, Attribution, Anomaly. Each gets 2-3 seconds. | Show pre-rendered screenshots of each module. |
| 1:45 | Live demo: chat → "show me the count of users by country" | "And if you want something the planner didn't generate, just ask. Watch." | Type the message. The agent calls the right MCP tool, returns a StatCard. | (Fallback C in `11-video-script.md`) |
| 1:55 | Live demo: StatCard renders | "Argus picks the right card for the right data. Charts for trends, tables for breakdowns, summaries for anomalies. You ask, it renders." | The StatCard renders with the data. Hover over the chart to show the tooltip. | n/a |
| 2:15 | Architecture diagram | "Here's the architecture. Vercel hosts the Next.js frontend. Cloud Run hosts the self-hosted Tambo backend, plus three custom Python services: a result-set guard that blocks $out and $merge, an MCP manager that handles per-tenant subprocesses, and the mongodb-mcp-server sidecar. The user's MongoDB is the data source. We never touch it directly — only through the MCP server, with the user's connection string." | The 3-box architecture diagram (per `08-x15-architecture-diagram.md`). | n/a (it's a static diagram) |
| 2:30 | Quick shot: Atlas UI | "And yes, it works on a free-tier M0 cluster. We've been running on M0 for the entire build." | 5-second shot of the seed data in MongoDB Atlas UI. | n/a |
| 2:45 | Title card | "Argus is open source, self-hosted, and works on a $0/month free-tier cluster. Three layers of write protection, five insight modules, one connection string. Try it on your own data. Link in the description." | Title card: GitHub URL + Devpost URL. | n/a |
| 3:00 | End card | *(silence)* | "github.com/your-org/argus · argus-mongodb.dev · Built for the 2026 MongoDB AI Hackathon" | n/a |

---

## Pre-production checklist

- [ ] Storyboard reviewed by all 3 team members
- [ ] Script timed (each row has a target duration; total ≤ 3:00)
- [ ] Fallbacks identified (4 fallbacks, all in `11-video-script.md`)
- [ ] Demo data seeded (per `scripts/seed_demo_data.py`)
- [ ] Cloud Run warmed up (ping `/healthz` 1 min before recording)
- [ ] Browser at `/connect` with the connection string pre-filled (one-click paste)
- [ ] `lucide-react` icons installed; dark mode is the default

---

## Production checklist

- [ ] Speaker is hydrated; voice is warmed up
- [ ] Microphone is on, tested, no background noise
- [ ] OBS / ScreenFlow is recording at 1080p, 30fps, H.264
- [ ] No notifications visible (Slack, Discord, Zoom, mail)
- [ ] Recording starts 5 seconds of silence (for editing headroom)
- [ ] Each row's narration is delivered in one take
- [ ] If a take fails, pause, breathe, restart from the previous row
- [ ] Recording ends with 5 seconds of silence (for editing tail)

---

## Post-production checklist

- [ ] Edit down to ≤ 3:00
- [ ] Add 2-3 second ambient music loops (royalty-free; e.g., from Uppbeat or YouTube Audio Library)
- [ ] Add captions (judges often watch on mute)
- [ ] Add the GitHub + Devpost URLs in the description AND on the closing card
- [ ] Add a 1-second fade-in at 0:00 and a 1-second fade-out at 3:00
- [ ] Export at 1080p, 30fps, H.264
- [ ] Upload to YouTube (unlisted, but the link is in the Devpost form)
- [ ] Add a custom thumbnail: dashboard screenshot + "Argus" + the tagline

---

## What this storyboard does

The storyboard is a planning document. It exists to:

1. **Lock the time budget.** Each row has a target duration; the total is 3:00.
2. **Identify the 4 fallbacks.** Each fallback is for a specific failure mode (read-only moment, modules, chat, full demo). The fallbacks are pre-written in `11-video-script.md`.
3. **Align the team.** The speaker, the demo operator, and the editor all work from the same document.
4. **Make the recording efficient.** With a storyboard, the recording session is 1 take per row, not 3 takes per row.

## What this storyboard does NOT do

- It does not specify the music. The editor picks royalty-free music.
- It does not specify the captions. The editor adds them in post.
- It does not specify the B-roll footage. The team can use stock footage or the seed-data UI.
- It does not specify the demo operator. The team assigns roles.

---

## The 30-second version (if 3 minutes is too long)

If the recording goes over 3 minutes (Devpost has a hard 3:00 limit), here's the 90-second version:

| Time | Shot | Narration |
|---|---|---|
| 0:00 | Title card | (silence) |
| 0:05 | Live demo: connect → onboarding | "Paste a connection string. Two minutes from paste to dashboard." |
| 0:20 | Live demo: read-only moment | "Try to drop a collection. Argus refuses. Three layers of write protection." |
| 0:40 | Live demo: 5 modules | "Five insight modules. Funnel, Cohort, RFM, Attribution, Anomaly. Real MQL pipelines." |
| 1:00 | Architecture diagram | "Vercel, Cloud Run, your MongoDB. Self-hosted, open source." |
| 1:15 | Quick shot: chat → StatCard | "Ask in plain English. Argus picks the right card." |
| 1:30 | Title card | "Argus. The agentic analyst for MongoDB Atlas. github.com/your-org/argus" |

The 90-second version is the **plan B** if the 3-minute version can't be recorded cleanly. Cut to 90 seconds is a 1-hour edit job.

---

## What to do with this storyboard

1. **Lock the script** by reading it aloud 3 times.
2. **Rehearse the demo** 3 times (with the fallbacks).
3. **Record** in one session, using the row-by-row structure.
4. **Edit** down to 3:00 with the fallbacks in reserve.
5. **Export, caption, upload, link.**

The storyboard is not a deliverable for the user. It's a working document for the team.
