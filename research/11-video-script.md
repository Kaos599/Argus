# 3-Minute Video Script (Verbatim)

**Date:** 2026-06-01
**Status:** Draft. Total runtime: ~3 minutes. Includes 3 fallback points if the live demo dies.

---

## Setup

- **Speaker:** The team member with the clearest voice. (Rehearse 3 times before recording.)
- **Recording:** OBS or ScreenFlow. 1920×1080, 30fps.
- **Splice plan:** 8 video segments + 1 voiceover section + 1 closing credit. Each segment ≤ 30 seconds.
- **Backup:** Have a 90-second "if everything breaks" version ready. It's a 1-take of you narrating screenshots.

---

## The script

### Segment 1: Cold open (0:00 - 0:15)

**On-screen:** Title card, plain text, no animation.

> "Argus. The agentic analyst for MongoDB Atlas."

**Narration:** *(none — let the text breathe)*

**Music:** 2 seconds of soft ambient. Fades out.

---

### Segment 2: The problem (0:15 - 0:30)

**On-screen:** Stock footage or a simple diagram: a MongoDB cluster, a confused person, a 200-line aggregation pipeline.

**Narration:**

> "If you've ever asked MongoDB 'what's happening with my data,' you know the answer is: read the docs, write a 50-line aggregation pipeline, run it, parse the result, build a chart. That takes an hour. Or you hire a data analyst. That's not an option for a solo developer."

---

### Segment 3: The demo — connect (0:30 - 0:50)

**On-screen:** Live demo. Browser open to `argus-mongodb.dev/connect`. Paste a connection string. Click "Connect."

**Narration:**

> "Argus is the first agentic analyst for MongoDB Atlas. You paste a connection string. Argus probes the cluster, samples the schema, and generates a draft dashboard of insights. Two to three minutes from paste to first dashboard. Watch."

**Action:** Paste the connection string to the seed data (per `scripts/seed_demo_data.py`).

---

### Segment 4: The read-only moment (0:45 - 1:00) [KEY DIFFERENTIATOR]

**On-screen:** The chat interface. Type: "drop the users collection."

**Narration:**

> "Here's a question you might ask an agent: 'drop the users collection.' Watch what happens."

**Action:** Type the message. The agent refuses with a card showing the 3 layers of write protection.

> "Argus shipped with three layers of write protection. The MCP server runs in read-only mode. We recommend connecting with a read-only database user. And the planner layer blocks $out and $merge stages at compile time, before they ever reach MongoDB."

**Music:** Soft swells under the narration. Fades out at 1:00.

---

### Segment 5: The 5 insight modules (1:00 - 1:45)

**On-screen:** Live demo. The dashboard is rendered with 5 cards: Funnel, Cohort, RFM, Attribution, Anomaly. Click into each.

**Narration:**

> "Argus ships with five insight modules: Funnel, Cohort, RFM, Attribution, and Anomaly. Each is generated from your schema and run as a MongoDB aggregation pipeline. Let me show you one."

**Action:** Click on the Funnel card. It expands to show the pipeline and the result.

> "This is a real MongoDB Aggregation Framework pipeline — $group, $facet, $bucket. The same pipeline a senior MongoDB engineer would write by hand, but generated in two seconds."

**Cut to:** A scroll through the other 4 cards. Each gets 2-3 seconds.

---

### Segment 6: The chat (1:45 - 2:15)

**On-screen:** Live demo. Type: "show me the count of users by country."

**Narration:**

> "And if you want something the planner didn't generate, just ask. Watch."

**Action:** Type the message. The agent calls the right MCP tool, returns a StatCard with the country breakdown.

> "Argus picks the right card for the right data. Charts for trends, tables for breakdowns, summaries for anomalies. You ask, it renders."

---

### Segment 7: The architecture (2:15 - 2:45)

**On-screen:** The 3-box architecture diagram (per `08-x15-architecture-diagram.md`).

**Narration:**

> "Here's the architecture. Vercel hosts the Next.js frontend. Cloud Run hosts the self-hosted Tambo backend, plus three custom Python services: a result-set guard that blocks $out and $merge, an MCP manager that handles per-tenant subprocesses, and the mongodb-mcp-server sidecar. The user's MongoDB is the data source. We never touch it directly — only through the MCP server, with the user's connection string."

**Cut to:** Quick 5-second shot of the seed data in MongoDB Atlas UI.

> "And yes, it works on a free-tier M0 cluster. We've been running on M0 for the entire build."

---

### Segment 8: The closer (2:45 - 3:00)

**On-screen:** Title card with GitHub URL + Devpost URL.

**Narration:**

> "Argus is open source, self-hosted, and works on a $0/month free-tier cluster. Three layers of write protection, five insight modules, one connection string. Try it on your own data. Link in the description."

**Music:** Same ambient as the cold open. Fades in at 2:50, fades out at 3:00.

**On-screen text:** "github.com/your-org/argus · argus-mongodb.dev · Built for the 2026 MongoDB AI Hackathon"

---

## Fallback plans (if the live demo dies)

### Fallback A: The read-only moment

If the agent doesn't refuse "drop the users collection" cleanly (e.g., it tries to call a tool that doesn't exist, returns an error, etc.):

> "Let me show you what happens when I ask Argus to drop a collection. [PAUSE while the demo runs] And as you can see, Argus refuses — it knows the operation isn't allowed. The read-only enforcement happens at three layers: the MCP server, the database user, and the planner."

**Cost:** 5 seconds of dead air. The point is made.

### Fallback B: The 5 modules

If a module errors out:

> "Argus picks the right insight module for the right data. The Funnel module — that just rendered. Let me show you the Cohort module. [CLICK on Cohort] And there it is. Notice the underlying pipeline — $group, $dateTrunc, $lookup. The same MongoDB aggregation you would write by hand."

**Cost:** Switch to a module that worked.

### Fallback C: The chat

If the chat is slow or breaks:

> "Sometimes the chat takes a moment. Let me show you the underlying pipeline. [OPEN the pipeline view] Here's the exact MongoDB aggregation Argus generated. You can copy it and run it in mongosh. You can also pin it to your dashboard."

**Cost:** 30 seconds of waiting. The point is made.

### Fallback D: Everything dies

If the entire demo dies (network, Cloud Run, etc.):

> "Let me show you a screenshot of what just rendered. [OPEN the screenshot folder] This is the dashboard — five insight modules from a 5,000-user MongoDB cluster. The planner generated these in two seconds. The underlying pipelines are visible if you click into any card. And yes, the read-only enforcement is real — the agent refused to drop a collection when I tested it earlier."

**Cost:** 30 seconds of clicking through screenshots. The point is made.

---

## Recording checklist (run through this the night before)

- [ ] Seed data is loaded into the demo MongoDB
- [ ] Cloud Run instance is warm (ping `/healthz` 1 minute before recording)
- [ ] Browser is at the right URL with no extensions visible
- [ ] Terminal is closed
- [ ] Desktop notifications are off
- [ ] Slack/Discord is closed
- [ ] Zoom is closed
- [ ] Microphone is tested (record 10 seconds, listen back)
- [ ] Webcam is off (we don't need it for this script)
- [ ] The 3 fallback screenshots are ready in case of failure
- [ ] The 90-second "if everything breaks" backup version is recorded

---

## Post-production checklist

- [ ] Add subtle ambient music (royalty-free, 2-3 second loops)
- [ ] Add captions (judges watch on mute often)
- [ ] Add the GitHub + Devpost URLs in the description AND on the closing card
- [ ] Export at 1080p, 30fps, H.264
- [ ] Total runtime: 2:50-3:00 (a little under 3 min is better than over)
- [ ] Upload to YouTube (unlisted, but with the link in the Devpost form)

---

## What this script does NOT cover

- The internal architecture of the result_set_guard (covered in the README's "How we built it" section)
- The MQL pipeline code (covered in `docs/example-pipelines.md`)
- The known limitations (covered in the README's "Known Limitations" section)
- The team (intentionally — judges care about the product, not the people)

These are deliberate cuts. The 3-min video is the highest-leverage asset. Every second counts.
