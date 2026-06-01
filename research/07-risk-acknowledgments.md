# X7/X8/X9 + X3/X4 Risk Acknowledgments

**Purpose:** Record the user's informed rejection of the audit's P0 recommendations, so the v2 plan builds on top of a decision rather than re-litigating one.

The user reviewed `00-audit-summary.md` and explicitly rejected the P0 fixes for X3, X4, X7, X8, X9. This document records **why the audit recommended what it recommended** and **what the user accepted as risk** so that if any of these risk surfaces during the 10-day build, the team has a paper trail.

The format is: recommendation → user decision → risk the user accepted.

---

## X3 — Blaze-shaped demo = potential Devpost "modification of existing project" violation

**Audit recommendation:** Strip all Blaze references from `argus.txt`, `ARCHITECTURE.md`, `README`, and demo data. Move the Blaze case study to a post-hackathon blog post. Use `sample_mflix.embedded_movies` for the Atlas Vector Search demo and a hand-crafted generic SaaS dataset for the insight demos. Rename all Blaze-shaped fields to neutral (`users`, `events`, `orders`, `sessions`).

**User decision:** Keep Blaze in submitted materials.

**Risk the user accepted:**
- Devpost rules forbid "modification of existing projects" (re-publish + re-submit). Appendix B of `argus.txt` lists 7 specific Blaze code paths with line numbers; §1.6 use cases are all Blaze-specific; the demo data is Blaze-shaped.
- A judge reading the README, recognizing the Blaze use case, and asking the question "is this just a re-skin of Blaze?" puts the team in a defensive position.
- The clean-room defense ("we built Argus, we used the Blaze repo as a case study, here's the diff") is workable but requires explicit preparation: the README should make the "we built this from scratch" framing unambiguous, with a project timeline showing greenfield commits starting May 22, 2026.

**Mitigation suggestion (not required):** Add a top-of-README line: "Argus is built from scratch for the 2026 MongoDB AI Hackathon. The Blaze case study in §X is illustrative — the codebase is independent, the data model is our own, and the insight modules are our own work." Plus a `git log --reverse` showing greenfield origin.

---

## X4 — All 5 insight modules in 3 days

**Audit recommendation:** Cut to 2-3 polished insight modules (Funnel + Cohort, optionally RFM). Build framework stubs for Attribution and Anomaly with honest "v2" framing. Cited that Tableau's RFM segmenter is a 6-week project for 4 engineers, and anomaly detection is research-grade.

**User decision:** Ship all 5 (Funnel, Cohort, RFM, Attribution, Anomaly).

**User reasoning (paraphrased):** "I don't understand why RFM would be so hard to do, so you can skip X4."

**Risk the user accepted:**
- ~4 hours per module if all 5 must be production-quality in 3 days. Realistic time per module: Funnel 2 hours, Cohort 2 hours, RFM 4 hours, Attribution 6 hours (requires Markov / Shapley value choice), Anomaly 12+ hours (requires statistical baseline + threshold + visualization).
- Two of the five modules (Attribution, Anomaly) will likely be visibly shallower than the others. The demo will be uneven.
- The "rushed demo syndrome" risk: during the 3-min video, the team will need to either (a) only demo the polished 2-3, or (b) demo all 5 and risk one of them looking half-baked.

**Mitigation suggestion (not required):** Define "v1" precisely for each module:
- **Funnel v1:** top-N events with conversion rate. Done in 2 hours.
- **Cohort v1:** weekly retention by acquisition week. Done in 2 hours.
- **RFM v1:** 5x5 grid, score = percentile rank per axis. Done in 4 hours.
- **Attribution v1:** first-touch only. Markov chain, Shapley values → v2. Done in 2 hours.
- **Anomaly v1:** z-score on daily metric vs trailing 28-day mean. Done in 4 hours.

If this is the bar, all 5 fit in 14 hours. Not trivial, but feasible for a team that has the math pre-loaded.

---

## X7 — No PII layer

**Audit recommendation:** Pydantic models classify fields as PII (regex on `email|phone|ssn|pass|token|card|address|ip`); planner prompt forbids raw PII in cards; `card_renderer.py` strips PII before sending to frontend. Document a "PII-safe card" rule.

**User decision:** Skip PII layer.

**User reasoning:** "We can skip X7. I don't think we need a P double I layer anywhere right now."

**Risk the user accepted:**
- A judge asks "show me all users with @gmail.com addresses" → the agent returns them in a card.
- A judge pastes admin credentials into the chat → the agent echoes them back in the conversation.
- A user connects a real MongoDB with customer data → the agent builds a dashboard with PII visible.
- A real attacker (not a judge) can construct adversarial prompts that extract emails, phone numbers, addresses from any tenant's data.

This is the highest-impact risk being accepted. The vulnerability is **immediate and demonstrable in the demo**, not theoretical.

**Mitigation suggestion (not required, but worth ~30 min of work):** Add a single line to the agent's system prompt: "If a card would render a field matching `/email|phone|ssn|pass|token|card|address|ip/i`, redact it as `***REDACTED***`." This is a 1-line change that closes 80% of the embarrassment.

---

## X8 — No API-level auth

**Audit recommendation:** Per-session JWT cookie issued at `/connect`; `tenant_id` is the JWT subject, not the connection hash. Two judges with the same connection string get different `tenant_id`s.

**User decision:** Skip auth concerns.

**User reasoning:** "We don't need to care about auth and write."

**Risk the user accepted:**
- The Devpost demo URL is indexable by Google within hours of submission. Any visitor can hit `POST /api/v1/connect` with their own MongoDB connection string and run the agent on it.
- Anyone with the URL can hit `GET /api/v1/dashboards/<id>` and read another judge's dashboards.
- Anyone with the URL can issue a `POST /api/v1/connect` to a MongoDB they own and probe the agent's prompt injection surface (e.g., field names containing "ignore previous instructions").
- The Cloud Run service account has read-write on the agent's MongoDB cluster, not just the per-tenant connection. An attacker who exploits a different vulnerability (XSS, SSRF) can pivot to the control plane.

**Mitigation suggestion (not required, but worth ~2 hours of work):** Add a single middleware that requires an `X-Demo-Mode: true` header for any `/api/v1/*` request, and have the frontend set that header. Not real auth, but blocks curl attacks. Document the limitation in the README's "Known limitations" section.

---

## X9 — $100 GCP credit form

**Audit recommendation:** Submit `https://forms.gle/xfv9vQzfRfNCCVbG7` as D1 action item 0. Deadline is June 4, 2026 (3 days from when this audit was run).

**User decision:** Skip GCP credit form.

**User reasoning:** "We don't need to care about X9."

**Risk the user accepted:**
- $300 in 10 days = $1/hr of inference. Free tier covers ~50% of one Gemini call. Without credits, the team will either (a) eat the overage on a personal card, or (b) get rate-limited mid-demo.
- The form takes 5 minutes. Skipping it doesn't save time; it just defers a small cost.

**Mitigation suggestion (not required, but worth 5 minutes of work):** Submit the form anyway. The downside is zero. If the team has already submitted, ignore this.

---

## What this document is NOT

- This document does not re-argue the rejected recommendations.
- This document does not commit to implementing any of the mitigation suggestions.
- This document exists so that the v2 plan can proceed on the basis of **informed decisions**, not lost ones. If a Blaze-shaped card goes viral on hackernews, the team has a record that the risk was flagged. If a judge gets PII, the team has a record that the risk was flagged. Etc.

## What the v2 plan should do with this information

- Proceed as if the rejected recommendations are **off the table**.
- The README's "Known limitations" section can be honest about the residual risks. (See `16-known-limitations.md`.)
- The agent's system prompt can still have the 1-line PII redaction rule (a "soft" version of the X7 recommendation). This is a 1-line change that takes 5 minutes and reduces embarrassment. Whether to include it is a 1-line decision for the team.
