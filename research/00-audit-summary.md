# Argus Audit Summary

**Date:** 2026-06-01
**Artifact type:** `plan`
**Perspectives dispatched:** 5 constructive (Backend, Frontend, Judge, SRE, Adversarial) + 1 nemesis, all in parallel
**Source artifacts audited:** `argus.txt` (60KB brief), `backend/ARCHITECTURE.md` (16KB)
**Verdict in one line:** The plan has a *strong* architecture story and a *weak* operational layer. Multiple catastrophic flaws across all 6 reviews. **Do not start D1 scaffolding until the cross-cutting issues below are resolved.**

---

## Cross-Cutting Issues (found by 2+ agents — these are real)

| # | Issue | Found by | Severity |
|---|---|---|---|
| **X1** | **MCP subprocess scope contradiction** — argus.txt says "per request"; ARCHITECTURE.md says "per session"; cron flow says "resume or respawn." Three different lifetimes, none works on Cloud Run. | Backend, Adversarial, SRE, Nemesis | **Catastrophic** |
| **X2** | **"Argus" name collides with multiple live products** — `aj-geddes/argus-panoptes` (MIT, ADK track competitor, March 2026), `tryargus.cloud` (AI infrastructure monitoring), `tryargus.dev` (flow monitoring), USPTO Serial 99681280 (Argus Secure Technology, Class 042). A judge Googling "Argus agent" lands on a competitor first. | Nemesis | **Catastrophic** |
| **X3** | **"Blaze-shaped" demo + Blaze case study in README = "modification of existing project" violation** — Devpost rules forbid it. Appendix B lists 7 specific Blaze code paths with line numbers. The §1.6 use cases are all Blaze-specific. | Nemesis (×2), Judge | **Catastrophic** |
| **X4** | **All 5 insight modules in 3 days is mathematically implausible** — Tableau's RFM segmenter is a 6-week project for 4 engineers. Anomaly detection is research-grade. | Judge, Nemesis, Adversarial | **Major** |
| **X5** | **`atlas-get-performance-advisor` requires M10+ cluster**, not M0. Claiming it on M0 = judge will see a runtime error. | Judge, Backend | **Major** |
| **X6** | **`$merge` contradicts `--readOnly` claim.** Listed in argus.txt §8.2 as a stage the agent uses. | Judge | **Catastrophic** |
| **X7** | **No PII layer anywhere.** A judge can ask "show me users" and the agent cheerfully renders emails/passwords in cards. | Adversarial, Nemesis | **Catastrophic** |
| **X8** | **No API-level auth on `/api/v1/*`.** Anyone with the URL can hit endpoints. `connection_hash` as tenant_id = two judges with the same string share state. | Adversarial, SRE | **Major** |
| **X9** | **The $100 GCP credit form is due June 4 (3 days)** — not flagged as a Day-1 action item. Without it, demo budget evaporates. | Judge | **Major** |
| **X10** | **The 60-second onboarding claim is fantasy** — actual time is 2-3 min once `$exists` probes + planner LLM call + 5 collection samples are accounted for. | Nemesis, Frontend | **Major** |
| **X11** | **No spec for any of the 7 component Zod schemas** — Tambo requires them; backend `card_renderer.py` emits against them. Without them, the contract can't exist. | Frontend | **Major** |
| **X12** | **No frontend directory structure; no 5-route table; no streaming contract; no SSE endpoint.** The plan is backend-complete, frontend-empty. | Frontend | **Major** |
| **X13** | **Cloud Run egress IP is dynamic** — IP-restricted MongoDBs (most production) will reject. | Adversarial | **Major** |
| **X14** | **Tambo's hosted `TamboProvider` may itself be a non-Google AI call** (per the strict "all AI must be Google" rule) — and the MCP integration with `mongodb-mcp-server` is unverified. | Nemesis, Frontend | **Major** |
| **X15** | **No architecture diagram.** README is the first thing judges read. A picture is the highest-ROI asset. | Judge, Nemesis | **Major** |
| **X16** | **Devpost has 12,426 participants, ~2,000 per track.** Median quality will be high. Differentiation has to be visible in 30 seconds. | Nemesis | **Strategic** |

---

## Priority-Ordered Action Items

### P0 (catastrophic — must decide BEFORE any code is written)

1. **Rename Argus.** (User decided: keep Argus — see `01-user-decisions.md`)
2. **Strip all Blaze material from the submitted repo.** (User decided: keep Blaze — see `01-user-decisions.md`)
3. **Cut to 2-3 polished insight modules.** (User decided: ship all 5 — see `01-user-decisions.md`)
4. **Fix the MCP subprocess contradiction.** (Decision: per-tenant subprocess, lazy respawn, 5-min idle timeout, max 10 per instance. See `06-x1-mcp-scope.md`.)
5. **Remove `$merge` from argus.txt §8.2.** Add a `result_set_guard` middleware.
6. **Add a PII layer.** (User decided: skip PII layer — see `07-risk-acknowledgments.md`.)
7. **Submit the GCP $100 credit form today.** (User decided: skip — see `07-risk-acknowledgments.md`.)
8. **Reconcile Cloud Run egress.** (User asked for options — see `03-x13-cloud-run-egress.md`.)

### P1 (hurts a rubric criterion significantly)

9. **Write the 7 Zod schemas for the card components.** (See `14-zod-schemas.md`.)
10. **Write the 5-route table.** (See `15-routes.md`.)
11. **Write the 3-min video script verbatim.** (See `11-video-script.md` and `18-video-storyboard.md`.)
12. **Draft the README "Potential Impact" section.** (See `10-readme-draft.md`.)
13. **Reframe readOnly as "three layers" in the README.**
14. **Lock `gemini-embedding-2`** (not `gemini-embedding-001`, not Voyage).
15. **Add the architecture diagram.** (See `08-x15-architecture-diagram.md`.)
16. **Lock `min-instances: 1` on Cloud Run** + `/healthz` pinger every 1 min.
17. **Implement `ModelRouter` with explicit fallback chain.**
18. **D1 spike: Tambo + `mongodb-mcp-server` integration.** (See `04-x14-tambo-mcp.md`.)
19. **Per-session JWT cookie** issued at `/connect`. (User decided: skip auth — see `07-risk-acknowledgments.md`.)
20. **Add `MQL pipeline examples`** to the README. (See `13-mql-examples.md`.)
21. **Draft the Devpost submission form.** (See `12-devpost-form.md`.)
22. **Add "Known limitations" section to README.** (See `16-known-limitations.md`.)
23. **Pin the `mongodb-mcp-server` version** (e.g., `1.2.3`).
24. **Top-K collection selection** before schema sampling.
25. **Two-pass schema sampling** — 100-doc cheap pass for shape, 10K-doc targeted pass for field existence, union.
26. **Result-set guard** — agent system prompt mandates `.limit()` on every `find`/`aggregate`; MCP server cap `MDB_MCP_READ_MAX_BYTES`.
27. **System collections filter** in `schema_explorer.py`.
28. **Connection-credential redaction** in chat history + tool-call traces + log filters.

### P2 (should fix)

29-44. See `00-audit-summary.md` source.

### P3 (nice to have)

45-50. See `00-audit-summary.md` source.

---

## What PASSES review (positive findings, do not re-derive)

- **Two-layer write protection intent** (--readOnly + read-only user) — strong design
- **Iterative preview onboarding** — clever 5-step UX
- **`{$exists}` probe acknowledgment** — team read the docs
- **MDSF-style scoring framework** — right shape for the insight-selection problem
- **Subprocess-per-tenant isolation** — correct security posture
- **Env var only for connection string** — most teams get this wrong
- **Gemini-only embargo** — disqualification risk mitigated
- **`data_hash` anti-staleness** — right shape
- **TTLs on insight storage** — bounds growth
- **Cloud Run + Vercel split** — right answer
- **Cloud Observability traces via ADK** — free tech points
- **Zod-typed component descriptors (no raw JSX)** — XSS closed at design level
- **The §10 risks table** — gold for the "Known limitations" section of README
- **MDSF citation** — exists; **but the formula is mischaracterized** (the actual paper scores context relevance + narrative coherence, not novelty × magnitude × user_weight). Either implement the actual MDSF scoring, or drop the citation and call the heuristic custom.

---

## The single biggest strategic decision

The most impactful changes (in order of leverage):

1. **Rename + strip Blaze** (X2 + X3) — protects from disqualification, removes name confusion. **(User deferred: keep Argus, keep Blaze.)**
2. **Cut to 2-3 insight modules** (X4) — protects from rushed-demo syndrome. **(User deferred: keep all 5.)**
3. **Add PII layer + readOnly enforcement** (X7) — protects from "show me users" embarrassment. **(User deferred: skip PII.)**
4. **Write the 7 Zod schemas + 5 routes + video script + README Impact section** (X11, X12, README) — the things that take a plan from "spec" to "demoable in 10 days"

---

**10 days. The plan as written needs 18-22. Cutting scope is non-negotiable. (User's call: they will manage scope themselves.)**
