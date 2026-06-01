# User Decisions & Pushback

**Date:** 2026-06-01
**Source:** Interactive session where the user reviewed `00-audit-summary.md` and responded to each finding.

---

## The Pushback

The user reviewed the audit summary and pushed back on the majority of the P0 recommendations. This document records **what the user accepted, what they rejected, and the reasoning** so the v2 plan can be built on top of informed decisions, not re-argued ones.

### Direct quotes from the user

> "Okay, here are my suggestions:
> - Suggest what we should do for X2.
> - X2 is fine.
> - For X3, you can ignore X3.
> - I don't understand why RFM would be so hard to do, so you can skip X4.
> - Why do you need merge? You will only get a read on the axis.
> - We can skip X7.
> - I don't think we need a PII layer anywhere right now.
> - We don't need to care about auth and write.
> - We don't need to care about X9.
> - We don't need to care about extend.
> - You provide an option for X13.
> - Verify X14.
> - X15 will be there, just listed.
> - X16 needs to be properly done.
> Our point is that you don't need to care about how many things we will need to do. We can manage that, but yeah."

---

## Decision Matrix

| # | Issue | Audit recommendation | User decision | Status |
|---|---|---|---|---|
| X1 | MCP subprocess scope | Lock to per-tenant subprocess, lazy respawn, 5-min idle, max 10 per instance | Not addressed, but no objection → apply as recommended | **APPLY** |
| X2 | "Argus" name collisions | Rename to AtlasLens / Mongosight / Sift | Keep Argus + disambiguate via tagline, domain, social post | **KEEP ARGUS, add disambiguation** (see `02-x2-name-strategy.md`) |
| X3 | Blaze-shaped demo = "modification of existing project" violation | Strip all Blaze from submitted materials | Keep Blaze in submitted materials | **KEEP BLAZE** (see `07-risk-acknowledgments.md`) |
| X4 | All 5 insight modules in 3 days implausible | Cut to 2-3 (Funnel + Cohort + RFM) | Ship all 5 (Funnel, Cohort, RFM, Attribution, Anomaly) | **SHIP ALL 5** (see `07-risk-acknowledgments.md`) |
| X5 | `atlas-get-performance-advisor` requires M10+, not M0 | Remove from §3.4, replace with M0-compatible tools | Not addressed → apply as recommended | **APPLY** |
| X6 | `$merge` contradicts `--readOnly` claim | Remove from spec, add result_set_guard | "Why do you need merge? You will only get a read on the axis" | **REMOVE $merge** (user confirmed we don't need it) |
| X7 | No PII layer | Add Pydantic PII classifier + planner prompt rule + card_renderer redaction | Skip PII layer | **SKIP** (see `07-risk-acknowledgments.md`) |
| X8 | No API-level auth | Add per-session JWT cookie, tenant_id = JWT subject | Skip auth concerns | **SKIP** (see `07-risk-acknowledgments.md`) |
| X9 | $100 GCP credit form due June 4 | Submit form as D1 action item 0 | Skip GCP credit form | **SKIP** (see `07-risk-acknowledgments.md`) |
| X10 | 60-second onboarding claim is fantasy | Reframe as 2-3 min in README | Not addressed → apply as recommended (silent default) | **APPLY** (rebrand to 2-3 min, document the time breakdown) |
| X11 | No 7 Zod card schemas | Write them | Not addressed → apply as recommended | **APPLY** (see `14-zod-schemas.md`) |
| X12 | No frontend directory, no routes, no streaming, no SSE | Build all four | Not addressed → apply as recommended | **APPLY** (see `15-routes.md`) |
| X13 | Cloud Run egress IP is dynamic | Three options (best-effort, VPC+NAT, IP allow-list docs) | User asked for an option to be provided | **PROVIDE OPTIONS** (see `03-x13-cloud-run-egress.md`) |
| X14 | Tambo + mongodb-mcp-server unverified | D1 spike (1 hour) | User asked to verify | **VERIFY** (see `04-x14-tambo-mcp.md`) |
| X15 | No architecture diagram | Add to README as first image | "X15 will be there, just listed" → already exists or is on the list | **CREATE** (see `08-x15-architecture-diagram.md`) |
| X16 | 12,426 competitors | Strategic positioning | "X16 needs to be properly done" | **DO PROPERLY** (see `05-x16-positioning.md`) |

### Items the user "deferred" without explicit decision (treated as silent-accept)

- X1, X5, X10, X11, X12, X15 — all apply as recommended
- X6 — user explicitly confirmed removal, so apply
- X14 — user explicitly asked for verification, so research and write findings

### Items the user "rejected" outright (apply with one-line risk acknowledgment)

- X3, X4, X7, X8, X9 — see `07-risk-acknowledgments.md`

---

## The single line that drives the entire v2 plan

> "Our point is that you don't need to care about how many things we will need to do. We can manage that, but yeah."

This is a directive: **the v2 plan is not allowed to nag about scope, time, or "this is too much for 3 people in 10 days."** The plan must assume the team is competent and will manage their own time. The plan's job is to specify *what* to build, not *how* to schedule it.

---

## What this means for the v2 plan

1. **All 5 insight modules ship.** Funnel, Cohort, RFM, Attribution, Anomaly. (No scope cuts.)
2. **No PII layer, no auth layer, no GCP credit form.** (Acknowledged risk.)
3. **Keep "Argus" as the project name.** (Add disambiguation per `02-x2-name-strategy.md`.)
4. **Keep Blaze references in submitted materials.** (Acknowledged risk of Devpost disqualification.)
5. **Cloud Run egress strategy: present an option for the user to pick.** (See `03-x13-cloud-run-egress.md`.)
6. **Verify Tambo + mongodb-mcp-server compatibility.** (See `04-x14-tambo-mcp.md`.)
7. **Architecture diagram is in the v2 plan.** (See `08-x15-architecture-diagram.md`.)
8. **X16 (competition positioning) gets real attention.** (See `05-x16-positioning.md`.)

---

## What this does NOT mean

- The plan still must be honest. If a feature is hard, the README's "Known limitations" section can say so. But the *plan* (argus.txt, ARCHITECTURE.md) doesn't get to scope-nag.
- The risk acknowledgments in `07-risk-acknowledgments.md` are recorded **once**, at the moment of rejection, so that if any of them bites during the 10 days, the team has a paper trail. After that, the plan moves on.
- If during the 10 days a feature becomes infeasible (e.g., Tambo integration doesn't work, RFM math doesn't converge), the team pivots. That's not a plan failure, that's just engineering.
