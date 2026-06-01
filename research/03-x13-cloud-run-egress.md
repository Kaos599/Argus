# X13 — Cloud Run Egress: Three Options

**Audit finding:** Cloud Run egress IP is dynamic. IP-restricted MongoDBs (most production) will reject the connection from a Cloud Run instance.

**User request:** "You provide an option for X13."

**The three options below:** the team picks one. The recommendation is Option A for the hackathon, with Option B as a fallback if the demo needs to hit a real IP-restricted MongoDB.

---

## Background

When a Cloud Run instance makes a request to a MongoDB cluster, the source IP is one of Google's published egress IP ranges, which is shared across all Cloud Run customers in the same region. The IP **changes per request** (because Cloud Run can route through different points-of-presence) and is **shared with other customers** (because there's no per-tenant IP isolation without extra networking).

If the MongoDB has an IP allow-list, every customer's request from Cloud Run is going to look like a request from "some Google IP" — and the allow-list either:
- Allows ALL of Google's IP ranges (large attack surface, defeats the purpose of the allow-list), or
- Allows only specific IPs (which Cloud Run can't provide), or
- Doesn't have an allow-list (works for any IP, no problem).

For the hackathon demo, the recommended path is **Option A**: use a MongoDB without an IP allow-list. Atlas M0 free clusters don't have IP allow-lists by default. Document the limitation in the README.

---

## Option A: Best-effort, no VPC, document the limitation

**Setup time:** 0 minutes.
**Monthly cost:** $0.
**Limitation:** IP-restricted MongoDBs will reject.

**Implementation:**

1. Connect Cloud Run to the MongoDB with the standard connection string. No VPC, no NAT, no Serverless VPC connector.
2. The demo uses an Atlas M0 free cluster (or any non-IP-restricted MongoDB).
3. README "Known limitations" section:
   > IP-restricted MongoDBs require Serverless VPC + Cloud NAT (see Appendix C). The default demo uses an Atlas M0 free cluster with no IP allow-list.

**When to choose this:**
- The hackathon demo is on a MongoDB you control (most likely).
- The user can accept that production deployments need Option B.
- 0 setup time matters (it does, in a 10-day timeline).

**When NOT to choose this:**
- The judge demos against a real customer MongoDB with an IP allow-list.
- The README's "production-realism" criterion gets weighed heavily by the judges.

---

## Option B: Serverless VPC + Cloud NAT with static IP

**Setup time:** ~30 minutes.
**Monthly cost:** ~$30 (Serverless VPC connector is ~$30/mo + Cloud NAT is ~$30/mo for the demo usage; costs scale with traffic).
**Limitation:** Adds ~5s to cold start.

**Implementation:**

1. Create a Serverless VPC connector in the same region as Cloud Run.
2. Create a Cloud Router + Cloud NAT gateway attached to the connector.
3. Reserve a static external IP address.
4. Configure the NAT gateway to use only the static IP.
5. Cloud Run is configured to use the VPC connector for egress.
6. Document the static IP in the onboarding flow: "If your MongoDB is IP-restricted, add this IP to your allow-list: `<STATIC_IP>`."

**Setup commands (gcloud):**
```bash
# 1. Reserve a static IP
gcloud compute addresses create argus-egress-ip --region=us-central1

# 2. Create the VPC connector
gcloud compute networks vpc-access connectors create argus-connector \
  --region=us-central1 \
  --network=default \
  --range=10.8.0.0/28

# 3. Create the Cloud Router
gcloud compute routers create argus-router --network=default --region=us-central1

# 4. Create the Cloud NAT
gcloud compute routers nats create argus-nat \
  --router=argus-router \
  --region=us-central1 \
  --nat-external-ip-pool=argus-egress-ip
```

Then in Cloud Run, set `--vpc-connector=argus-connector --vpc-egress=private-ranges-only`.

**When to choose this:**
- Production-realism is a rubric criterion.
- The judge demos against a real IP-restricted MongoDB.
- The team has 30 minutes to spare on D1.

**When NOT to choose this:**
- $30/mo is a non-trivial cost for a 10-day hackathon.
- The demo MongoDB doesn't have an IP allow-list anyway.
- Cold start latency matters (5s is a lot for a "60-second onboarding" demo).

---

## Option C: Document the IP allow-list pattern in the onboarding

**Setup time:** ~5 minutes.
**Monthly cost:** $0.
**Limitation:** Each user has to add Google's wide IP ranges (or a Serverless VPC IP if they set one up) to their MongoDB's allow-list.

**Implementation:**

1. Don't set up a Serverless VPC connector.
2. In the onboarding flow (`/connect`), show this warning:
   > "If your MongoDB has an IP allow-list, add Google's Cloud Run egress IP ranges: `https://www.gstatic.com/ipranges/cloud.json` (filter for `cloud-run` or `google-cloud`)."
3. In the README's "Known limitations":
   > "Production deployments with IP-restricted MongoDBs require either (a) a Serverless VPC + Cloud NAT with a static IP (~30 min setup), or (b) maintaining an allow-list of Google's dynamic egress ranges."

**When to choose this:**
- The team is too time-pressed for Option B.
- The user accepts the production-deployment friction.
- The demo MongoDB doesn't have an IP allow-list.

**When NOT to choose this:**
- The judge demos against an IP-restricted MongoDB.
- The README's "production-realism" criterion matters.

---

## Recommendation

**Pick Option A for the hackathon.** Reasons:

1. **0 setup time.** The team has 10 days. Every minute spent on infrastructure is a minute not spent on the 5 insight modules.
2. **The demo MongoDB doesn't have an IP allow-list.** Atlas M0 free clusters don't. The hackathon-provided Atlas cluster likely doesn't. Production users will figure it out.
3. **The README's "Known limitations" section can be honest.** This is the right kind of limitation to document — a production deployment friction, not a hackathon-day blocker.
4. **The $30/mo cost is avoidable.** Why pay for Cloud NAT when the demo doesn't need it?

If during the 10 days the team decides they need a real IP-restricted MongoDB demo, **upgrade to Option B** in 30 minutes. The setup is well-documented above.

---

## What this document does NOT cover

- **VPC Service Controls.** This is a higher-level security perimeter that wraps both Cloud Run and MongoDB Atlas. It's a much larger setup (hours, not minutes) and is overkill for the hackathon. Don't go here.
- **MongoDB Atlas Private Endpoints (AWS PrivateLink / GCP Private Service Connect).** This is the right answer for production, but the setup is multi-day and requires coordination with MongoDB support. Don't go here.
- **mongo-over-TLS with client certificates.** Some IP-restricted MongoDBs also require client certs. If the demo MongoDB requires this, the team has bigger problems than egress.

---

## What the v2 plan should specify

- **Section in `ARCHITECTURE.md`:** "Egress strategy: best-effort, no VPC. See Appendix C in README for production deployment with IP-restricted MongoDBs."
- **Section in README "Known limitations":** "Argus uses Cloud Run's default egress. IP-restricted MongoDBs require Serverless VPC + Cloud NAT (see Appendix C)."
- **Section in README "Appendix C":** "Production deployment with IP-restricted MongoDBs" — short paragraph with the gcloud commands from Option B, plus the cost estimate.
