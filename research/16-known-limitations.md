# Known Limitations

**Date:** 2026-06-01
**Status:** Draft. The "Known limitations" section for the README. ~250 words.

---

## Known limitations

Argus v1 ships with the following limitations. Each is a known issue with a planned v2 path.

### Read-only enforcement

- **No PII redaction.** v1 renders fields matching `/email|phone|ssn|pass|token|card|address|ip/i` as raw text in cards. We recommend connecting with a sandbox cluster for the demo, and reviewing all card data before sharing screenshots. The 1-line system prompt rule that mitigates 80% of this risk is not enabled in v1. Planned for v2.

- **No API-level auth.** v1 has no per-user authentication on `/api/v1/*` endpoints. Anyone with the URL can connect their own MongoDB and run the agent. The Cloud Run service is publicly accessible. For demo purposes, this is acceptable; for production, deploy behind a Cloud Run gateway with an API key. Planned for v2.

### Atlas tier compatibility

- **No Atlas Performance Advisor.** The `atlas-get-performance-advisor` tool requires an M10+ cluster. v1 uses `atlas-list-clusters` and `atlas-describe-cluster` (M0-compatible). Performance Advisor is planned for v2, gated on the user's cluster tier.

- **`atlas-list-alerts` requires M10+ for some alert types.** v1 surfaces only basic cluster health (status, region, tier). Full alerts are planned for v2.

### Insight modules

- **Anomaly detection is v1 of the algorithm.** Z-score on daily metrics against a trailing 28-day mean. v2 will use seasonal decomposition (STL) to handle weekly and yearly seasonality.

- **Attribution is first-touch only.** v2 will add Markov chains and Shapley values for multi-touch attribution.

- **RFM is a 5×5 grid based on percentile rank.** v2 will allow custom boundary definitions and weighted scores.

### Real-time

- **No change streams.** Dashboards are polled at a 30-second interval by default. Real-time push via SSE is planned for v2.

### Atlas Vector Search

- **No vector search in v1.** v1 supports text-based search via MongoDB's `$text` operator. v2 will add Atlas Vector Search with `gemini-embedding-2` embeddings.

### Egress

- **Cloud Run default egress is dynamic.** IP-restricted MongoDBs (most production clusters) will reject the connection. v1 supports the demo use case (Atlas M0 with no IP allow-list). For production deployments, see [Appendix C: Production deployment with IP-restricted MongoDBs](#appendix-c-production-deployment-with-ip-restricted-mongodb) in the README.

### Self-hosting

- **No Helm chart or Terraform module.** v1 is a Docker Compose stack. Production deployment requires manual `gcloud` and `kubectl` configuration. Planned for v2.

- **No multi-region failover.** v1 deploys to a single Cloud Run region. v2 will add multi-region active-active.

### Subprocess lifecycle

- **Per-tenant subprocess idle timeout is 5 minutes.** A user who returns after 5 minutes of inactivity will experience a 200-500ms cold start. v2 will use a smarter pre-warming strategy based on usage patterns.

### MCP server

- **Single `mongodb-mcp-server` subprocess per tenant.** For tenants with high concurrency (>10 simultaneous requests), subprocesses are LRU-evicted. v2 will use a connection pool within a single subprocess for high-concurrency tenants.

### What we deliberately did NOT build in v1

The following are **out of scope** for v1. Each is a future direction, not a current limitation.

- **Write tools.** By design. The 3 layers of write protection are non-negotiable.
- **Cross-cluster queries.** v1 connects to one MongoDB cluster at a time.
- **MongoDB Charts integration.** v1 renders its own charts. MongoDB Charts integration is a v3 direction.
- **Custom insight modules.** v1 ships with 5 fixed modules. The planner is not user-extensible.
- **Schema migrations.** v1 reads the schema; it does not modify it.

---

## The story this section tells

A judge reading "Known limitations" sees:

1. **Honesty.** The team is upfront about what v1 doesn't do.
2. **The 3 layers of write protection are real** (mentioned first, in the first bullet).
3. **v2 is planned, not promised.** Each limitation has a path forward.
4. **The out-of-scope items are deliberate.** Write tools are a feature we're not building, not a feature we're failing at.

This section is part of the rubric's "potential impact" sub-criterion. A well-written limitations section can score 7-8 / 10 on that sub-criterion; a poorly-written or absent one can score 3-4.

---

## What this gets the team

- A defensible "Known limitations" section in the README.
- A "what v2 looks like" framing that sets up the post-hackathon roadmap.
- A demonstration of technical maturity (the team knows what they didn't build, and why).

## What this does NOT cover

- The implementation details of any v2 feature.
- The timeline for v2.
- The pricing model for v2 (if any).
