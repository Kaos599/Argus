# X2 — Name Strategy: Keeping "Argus" with Disambiguation

**Audit finding:** "Argus" name collides with multiple live products. A judge Googling "Argus agent" lands on a competitor in position 1-3. The strongest candidates in the rename sweep were AtlasLens, Mongosight, Sift, Prism, Foresight, Outpost, Beacon.

**User decision:** Keep "Argus" as the project name.

**The strategy:** Three disambiguating moves that make the brand stickier than the collisions, without forcing a rename.

---

## Why disambiguation matters

A judge has 30 seconds with your README. If their brain pattern-matches "Argus" to "Argus Secure Technology" (USPTO Class 042 software) or "tryargus.cloud" (AI infrastructure monitoring), they will skim your README with a confused mental model: "is this the same product? what's the difference?" Skim mode is death for a hackathon submission.

Disambiguation takes 10 minutes total. Here's the three-step protocol.

---

## Step 1: The H1 tagline

The first line of the README, in H1:

```markdown
# Argus — the agentic analyst for MongoDB Atlas
```

Why this works:
- "MongoDB Atlas" anchors the brand to a specific ecosystem. Even a confused judge Googling "Argus MongoDB Atlas" lands on this README, not on the cloud monitoring tool.
- "Agentic analyst" is the product category. Different from "monitoring" (tryargus.cloud) and different from "panoptes" (Argus the all-seeing eye from Greek myth).
- The phrase fits in one line and is the kind of line that gets quoted.

**Cost:** 0 minutes (one line of markdown).
**Risk:** None.

## Step 2: Claim the domain

A 404 page on `argus-mongodb.dev` or `argus-atlas.dev` that says:

> Argus, the agentic analyst for MongoDB Atlas, is being built for the 2026 MongoDB AI Hackathon. Project: github.com/your-org/argus. Live demo: ...

Why this works:
- A judge Googling "Argus" sees the domain. Even an empty domain with a 404 page that says "this is a hackathon project" claims the namespace.
- $12/year for a domain. ~5 minutes to set up.
- The 404 page can be a single file on Vercel.

**Cost:** $12 + 5 minutes.
**Risk:** Minimal (squatters can grab the domain later, but they won't have the right 404 copy).

## Step 3: A 24-hour disambiguation post

Submit to Product Hunt, Hacker News (Show HN), and one MongoDB community (the MongoDB Community Slack or the r/MongoDB subreddit) within the first 24 hours of project launch. Title:

> Show HN: Argus — agentic analyst for MongoDB Atlas, built for the 2026 AI Hackathon

The bot crawlers index "Argus" → "MongoDB Atlas" as a strong association in the first 24h. Subsequent searches for "Argus" surface this post above the live products.

**Cost:** 30 minutes (one post, three channels).
**Risk:** A bot crawler could rank the post low if the timing is wrong. The 24h window is the high-confidence period.

---

## Optional Step 4: The README disambiguation paragraph

A 50-word paragraph at the bottom of the README, in smaller text:

> Argus is an independent open-source project built for the 2026 MongoDB AI Hackathon. It is unrelated to tryargus.cloud (AI infrastructure monitoring), Argus Secure Technology (USPTO Class 042), or aj-geddes/argus-panoptes (the ADK agentic framework). The name "Argus" is from the Greek myth of the all-seeing giant — fitting for a tool that watches a MongoDB cluster for you.

**Cost:** 5 minutes.
**Risk:** Reads defensive. **Only do this if the above three steps don't get traction.**

---

## What this gets the team

- A judge Googling "Argus" hits the README, the domain, and the show-HN post in the first 5 results.
- The 30-second mental model in the judge's brain: "Argus = hackathon project for MongoDB Atlas. Different from those other Argus products."
- The brand association "Argus for MongoDB Atlas" gets baked in by the time the judge clicks through to the live demo.

## What this does NOT solve

- It does not solve the "two Argus products in the same hackathon track" risk (if `aj-geddes/argus-panoptes` is in the same track, the judges see both). Mitigation: the README's opening line and the project description make the difference clear ("agentic analyst" vs "agentic framework").
- It does not solve the "what does the brand mean" problem. Argus the all-seeing giant is a strong metaphor for a MongoDB cluster monitor. Own it.

---

## Acceptance criteria

After these three steps are done, the team can proceed with "Argus" as the name without further name-related decisions. If after 48 hours of project launch the disambiguation hasn't worked (e.g., the show-HN post got 0 points, the domain is still squatted by someone else), the team can revisit the rename. But by then, the README + Devpost form will be submitted, so the rename cost is high.
