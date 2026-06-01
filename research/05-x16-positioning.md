# X16 — Competition Positioning (12,426 Devpost Submissions)

**Audit finding:** Devpost has 12,426 participants, ~2,000 per track. Median quality will be high. Differentiation has to be visible in 30 seconds.

**User request:** "X16 needs to be properly done."

**This document is the strategic positioning playbook for Argus. It's not a feature spec — it's a 30-second differentiation strategy that maps to specific demos, screenshots, and copy choices.**

---

## The Competition Landscape

### What 80% of submissions will look like

By the 10th day of a hackathon with 12,426 submissions, the median project will be:

- **A chatbot that connects to MongoDB.** Most teams will use the official MongoDB MCP server and ask "what are my top customers?" Most answers will be text-only or a hardcoded table.
- **A hardcoded dashboard.** Plot of "daily active users" with no drill-down. No agent, no insight.
- **A "Looker/Tableau clone" with one or two visualizations.** Often Tableau-style dashboards, sometimes with a chat box on the side that doesn't do anything useful.

These submissions will be technically competent but boring. They will be hard to differentiate.

### What 15% of submissions will look like

The "good" tier:

- **A working agent with a few MCP tools.** The agent can answer questions, but the UI is text-only.
- **A real-time dashboard with one or two interactive filters.** The dashboard is the product, the AI is a side feature.
- **A vector-search demo with embedding-based retrieval.** Strong on the tech, weak on the "what does the user do with this?" answer.

These submissions are differentiated. They will compete for the top 200 spots in the hackathon.

### What 5% of submissions will look like

The "great" tier:

- **End-to-end agentic workflow with multi-step reasoning.** The agent doesn't just answer; it plans, executes, and shows its work.
- **Generative UI that adapts to the user's request.** Not hardcoded cards — the agent picks the right visualization.
- **A real, novel product wedge.** Not "yet another chat with your data" — a specific insight that the user couldn't get from any other tool.

Argus targets the 5% tier. The strategy is: **be in the 5%, accept the 80% as background noise, and don't try to compete on every dimension.**

---

## The 30-Second Differentiation Strategy

When a judge opens the Argus README, they have 30 seconds to answer: "What is this, and why is it different?"

The opening line of the README, in H1, must answer both:

```markdown
# Argus — the agentic analyst for MongoDB Atlas

**The first agent that ships with three layers of write protection and works on a $0/month free-tier Atlas cluster.** Turn a MongoDB connection string into a board, a chat, and a natural-language interface — without ever mutating the underlying data.
```

**Why this works:**

1. **"Agentic analyst"** is a category claim, not a feature claim. The judge immediately knows what Argus is and is not.
2. **"Three layers of write protection"** is the unique technical claim. Most teams will have zero layers; a few will have one (the `--readOnly` flag). Three is unusual.
3. **"Works on a $0/month free-tier Atlas cluster"** is the accessibility claim. The judge knows that the demo can be reproduced.
4. **"Turn a MongoDB connection string into a board, a chat, and a natural-language interface"** is the product description in 17 words.
5. **"Without ever mutating the underlying data"** is the trust claim. The judge can run the demo on their own cluster without fear.

This line is the strategic asset. It is the first sentence a judge reads. It must be the first sentence a judge reads.

---

## The 5 Differentiation Pillars

In priority order (highest leverage first):

### Pillar 1: The "read-only by default" moment

**The single most demonstrable differentiator in the live demo.** A judge types "drop the users collection." The agent refuses, with a card explaining the three-layer protection. Screenshot this for the README.

**The script for the 3-min video:**

> [Time: 0:45]
> "Here's a question you might ask an agent: 'drop the users collection.' Watch what happens when I ask Argus."
>
> [Agent refuses with a card showing the three layers.]
>
> "Argus shipped with three layers of write protection out of the box. The MCP server runs in read-only mode. We recommend connecting with a read-only database user. And the planner layer blocks $out and $merge stages at compile time, before they ever reach MongoDB. Let me show you the planner-layer block in the code."

This 15-second moment is more persuasive than 2 minutes of dashboard demos. It is the "I built this because it's a real product, not a hackathon toy" signal.

**Where this lives in the README:**
- The opening H1 line (above)
- A "Read-only by default" section near the top
- A screenshot of the refusal moment
- A "How we enforce read-only" subsection with the three layers

**Where this lives in the live demo:**
- At 0:45 in the video
- As a 30-second demo moment in the Devpost form

### Pillar 2: The 5-step onboarding with progressive disclosure

**Most teams will hardcode their onboarding.** Argus will show the data, not describe it.

**The script:**

> [Time: 1:15]
> "Here's the Argus onboarding. You paste a MongoDB connection string. Argus probes the cluster for collections. It samples 5 collections to understand the schema. It picks the top 5 most promising collections. And it generates a draft dashboard for each one. You accept the ones you like and customize the rest."
>
> [Live demo: paste string, watch the 5 steps happen in real time.]

**The 60-second claim is false (the audit was right).** Reframe to 2-3 minutes in the README. The honest time is:
- Connection probe: 2-3 seconds
- Collection enumeration: 1-2 seconds
- Schema sampling (5 collections, 100 docs each): 5-10 seconds
- Planner LLM call: 5-15 seconds
- Dashboard generation: 10-20 seconds
- User review time: 60-120 seconds (the human is the bottleneck)

**Total: ~2-3 minutes from paste to first dashboard.** This is still impressive. Don't claim 60s; claim 2-3 min.

**Where this lives in the README:**
- A "5-step onboarding" section with a screenshot of each step
- A "Why 2-3 minutes, not 60 seconds" subsection (showing the breakdown above)

### Pillar 3: The Interactable board (12-col grid, drag-drop, persistent)

**Most teams will hardcode their dashboard.** Argus will let the user build their own.

**The script:**

> [Time: 1:45]
> "Once you have a dashboard, you can drag-and-drop cards to reorganize. You can resize cards. You can pin cards to a watchlist. And your layout persists across sessions."
>
> [Live demo: drag a card, resize it, refresh the page, layout persists.]

**The technology choice:** `react-grid-layout` (the standard, well-tested library). Persistence via `PUT /api/v1/dashboard/layout`.

**Where this lives in the README:**
- A "Customizable boards" section
- A 5-second GIF of drag-and-drop in action

### Pillar 4: The MQL pipeline examples in the README

**This is the "what does an expert see" signal.** MongoDB judges (which there will be some of) read the README looking for MQL fluency.

**Three example pipelines, ready to ship:**

1. **`$facet` for multi-metric cohort analysis**
2. **`$bucket` for revenue segmentation**
3. **`$setWindowFields` for rolling retention**

These go in the README, not in the code. See `13-mql-examples.md` for the actual pipelines.

**Where this lives in the README:**
- A "MQL fluency" section near the bottom
- 3 code blocks, ~15 lines each, with explanations

### Pillar 5: The architecture diagram (3 boxes, 30 seconds)

**The most-bang-for-buck image in the entire submission.** See `08-x15-architecture-diagram.md` for the spec.

**Why it matters:**
- Judges are tired. A picture is faster than text.
- It signals "this is a real product, with a real architecture, not a vibe-coded demo."
- It's the easiest place to show the MCP server, the read-only enforcement, and the self-hosted Tambo backend.

**Where it lives:** First image in the README, right after the H1 line. Above the fold.

---

## The 5 Anti-Differentiators (things to NOT do)

1. **Don't claim 60-second onboarding.** It will be tested, and it will fail.
2. **Don't show a Tableau-style dashboard.** Tableau exists; you don't beat Tableau at being Tableau.
3. **Don't make the chat the whole product.** Chat is one of three surfaces (board, chat, NL query). The board is the homepage.
4. **Don't hide the architecture behind a marketing pitch.** Judges are technical; they want to see how it works.
5. **Don't compete on the number of integrations.** You ship with 24 DB tools + 19 Atlas tools. That's the spec, not a marketing claim.

---

## The Devpost Form Strategy

The Devpost form has 5 fields that judges see in order:

1. **Project title:** "Argus — the agentic analyst for MongoDB Atlas"
2. **Tagline (max 200 chars):** "Turn a MongoDB connection string into a board, a chat, and a natural-language interface. Three layers of write protection. Works on Atlas M0."
3. **Built with:** Cloud Run, Vercel, Gemini 3 Flash, Tambo (self-hosted), mongodb-mcp-server, Next.js 15, MongoDB Atlas Vector Search, Google Cloud Observability
4. **Description (text, ~500 words):** See `12-devpost-form.md` for the draft.
5. **Links:** GitHub repo + live demo URL + 3-min video

**The tagline is the second-most-important sentence in the submission** (after the README H1). It must be the same sentence in both places, to reinforce the "first agentic analyst" claim.

---

## The README's 5 Sections in Priority Order

The README is the judge's first impression. Sections in priority order:

1. **H1 + tagline + 1 architecture diagram.** Above the fold.
2. **"Read-only by default" with a screenshot of the refusal moment.** This is the differentiator.
3. **"5-step onboarding" with 5 screenshots.** This is the demo.
4. **"5 insight modules" with one screenshot per module.** This is the product.
5. **"How we built it" — the architecture diagram + 1 paragraph of MQL examples.** This is the technical depth signal.

**Sections below the fold** (less critical but still important):
- Potential Impact
- Built With
- MQL pipeline examples
- Known Limitations
- Appendix: Production Deployment

---

## The 30-Second Elevator Pitch (in case the judge is at a booth)

> "Argus is the first agentic analyst for MongoDB Atlas. You paste a connection string, it generates a dashboard and a chat, and it never mutates the underlying data. Three layers of write protection. Works on Atlas M0. Five insight modules: Funnel, Cohort, RFM, Attribution, Anomaly. Built in 10 days for the MongoDB AI Hackathon 2026."

**Time: 25 seconds.** **Covers:** what it is, who it's for, what's different, what it does, how long it took.

**Practice this 3 times before the demo.** The pitch is the most-asked question; the demo is the most-seen moment; but the pitch is the first thing the judge hears.

---

## What This Document is NOT

- This document is not a feature list. The features are in `09-v2-plan-outline.md`.
- This document is not a copy doc. The copy is in `10-readme-draft.md` and `12-devpost-form.md`.
- This document is a strategic framework for making decisions when tradeoffs arise. When the team debates "should we add feature X vs. demo moment Y," the answer is "does X strengthen one of the 5 pillars?" If yes, do it. If no, defer it.

---

## Acceptance criteria

This strategy is "done" when:
1. The README H1 line is locked.
2. The 5 pillars each have a screenshot or a video clip.
3. The Devpost form tagline is the same as the README H1.
4. The 30-second elevator pitch is rehearsed.
5. The 3-min video script is drafted (see `11-video-script.md` and `18-video-storyboard.md`).
6. The 5 anti-differentiators are visible to the team (so they don't accidentally do them).
