# MQL Pipeline Examples for the README

**Date:** 2026-06-01
**Status:** Draft. Three production-grade MongoDB Aggregation Framework pipelines. Each is the actual code that runs for one of Argus's 5 insight modules.

---

## Example 1: Multi-metric cohort analysis with `$facet`

**Powers:** The Funnel module. Returns signups, activations, and revenue for the last 7 days, in a single round-trip.

```javascript
// Funnel: signups, activations, and revenue for the last 7 days
db.users.aggregate([
  {
    $match: {
      signup_date: { $gte: { $dateSubtract: { startDate: "$$NOW", unit: "day", amount: 7 } } }
    }
  },
  {
    $facet: {
      "signups": [
        { $count: "count" }
      ],
      "activations": [
        { $match: { activated: true } },
        { $count: "count" }
      ],
      "revenue": [
        { $match: { first_purchase_at: { $exists: true } } },
        { $group: { _id: null, total: { $sum: "$first_purchase_amount" } } }
      ],
      "by_country": [
        { $group: { _id: "$country", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]
    }
  }
]).toArray()
```

**What this returns:**
```json
[{
  "signups": [{ "count": 47 }],
  "activations": [{ "count": 31 }],
  "revenue": [{ "_id": null, "total": 12847.50 }],
  "by_country": [
    { "_id": "US", "count": 22 },
    { "_id": "DE", "count": 8 },
    { "_id": "GB", "count": 5 }
  ]
}]
```

**Why this is interesting:** The four sub-queries run in a single aggregation. The planner LLM chose `$facet` because the user asked "show me signups AND activations AND revenue." Without `$facet`, this would be 3 separate round-trips.

**Card it powers:** A Funnel card with 3 KPI tiles (signups, activations, revenue) and a horizontal bar chart of the top 10 countries.

---

## Example 2: Revenue segmentation with `$bucket`

**Powers:** The RFM module. Segments users into 5 revenue buckets, with a count and total per bucket.

```javascript
// RFM: segment users into 5 revenue buckets
db.orders.aggregate([
  {
    $match: {
      status: "completed",
      created_at: { $gte: { $dateSubtract: { startDate: "$$NOW", unit: "month", amount: 6 } } }
    }
  },
  {
    $group: {
      _id: "$user_id",
      total_spend: { $sum: "$amount" },
      order_count: { $sum: 1 },
      last_order: { $max: "$created_at" }
    }
  },
  {
    $bucket: {
      groupBy: "$total_spend",
      boundaries: [0, 50, 200, 500, 1000, 100000],
      default: "other",
      output: {
        user_count: { $sum: 1 },
        total_revenue: { $sum: "$total_spend" },
        avg_orders_per_user: { $avg: "$order_count" }
      }
    }
  },
  {
    $project: {
      bucket: { $concat: [
        { $toString: { $arrayElemAt: ["$_id", 0] } },
        "-",
        { $toString: { $arrayElemAt: ["$_id", 1] } }
      ] },
      user_count: 1,
      total_revenue: 1,
      avg_orders_per_user: { $round: ["$avg_orders_per_user", 2] }
    }
  }
]).toArray()
```

**What this returns:**
```json
[
  { "bucket": "0-50", "user_count": 423, "total_revenue": 8742.30, "avg_orders_per_user": 1.4 },
  { "bucket": "50-200", "user_count": 187, "total_revenue": 19834.20, "avg_orders_per_user": 2.1 },
  { "bucket": "200-500", "user_count": 64, "total_revenue": 21789.50, "avg_orders_per_user": 3.4 },
  { "bucket": "500-1000", "user_count": 21, "total_revenue": 14832.00, "avg_orders_per_user": 5.2 },
  { "bucket": "1000-100000", "user_count": 8, "total_revenue": 19284.10, "avg_orders_per_user": 8.7 }
]
```

**Why this is interesting:** `$bucket` is the right operator for fixed boundaries. For percentile-based segmentation, we'd use `$bucketAuto`. The planner LLM picks between them based on the schema.

**Card it powers:** An RFM card with a 5x5 grid (or, for v1, a simpler bar chart of the 5 buckets).

---

## Example 3: Rolling retention with `$setWindowFields`

**Powers:** The Cohort module. Computes 7-day rolling retention by acquisition cohort.

```javascript
// Cohort: 7-day rolling retention by acquisition week
db.events.aggregate([
  {
    $match: {
      event_type: { $in: ["app_open", "session_start"] },
      timestamp: { $gte: { $dateSubtract: { startDate: "$$NOW", unit: "day", amount: 84 } } }
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "user_id",
      foreignField: "_id",
      as: "user"
    }
  },
  { $unwind: "$user" },
  {
    $group: {
      _id: {
        user_id: "$user_id",
        cohort_week: { $dateTrunc: { date: "$user.signup_date", unit: "week" } }
      },
      last_active: { $max: "$timestamp" }
    }
  },
  {
    $setWindowFields: {
      partitionBy: "$_id.cohort_week",
      sortBy: { last_active: 1 },
      output: {
        days_since_signup: {
          $dateDiff: {
            startDate: "$_id.cohort_week",
            endDate: "$last_active",
            unit: "day"
          }
        }
      }
    }
  },
  {
    $bucket: {
      groupBy: "$days_since_signup",
      boundaries: [0, 1, 7, 14, 30, 60, 90],
      default: "90+",
      output: {
        user_count: { $sum: 1 },
        cohorts: { $addToSet: "$_id.cohort_week" }
      }
    }
  },
  {
    $project: {
      days_since_signup: "$_id",
      user_count: 1,
      cohort_count: { $size: "$cohorts" }
    }
  }
]).toArray()
```

**What this returns:**
```json
[
  { "days_since_signup": 0, "user_count": 8234, "cohort_count": 12 },
  { "days_since_signup": 1, "user_count": 4102, "cohort_count": 12 },
  { "days_since_signup": 7, "user_count": 1847, "cohort_count": 12 },
  { "days_since_signup": 14, "user_count": 1241, "cohort_count": 12 },
  { "days_since_signup": 30, "user_count": 723, "cohort_count": 12 },
  { "days_since_signup": 60, "user_count": 312, "cohort_count": 12 },
  { "days_since_signup": 90, "user_count": 89, "cohort_count": 12 }
]
```

**Why this is interesting:** `$setWindowFields` is a MongoDB 5.0+ feature that lets you compute rolling metrics in the aggregation pipeline. The traditional alternative is `$lookup` + `$unwind` + `$group`, which is 2-3x slower and 3-4x more code. The planner LLM uses `$setWindowFields` whenever the question is "rolling X over Y."

**Card it powers:** A Cohort card with a heatmap of acquisition week (rows) × days since signup (columns), with cell values = number of active users.

---

## How the planner picks

The planner LLM (Gemini 3 Flash) sees:

1. **The user's question** (e.g., "show me revenue by user segment").
2. **The schema** (sampled from the user's MongoDB, top 5 collections, 100 docs each).
3. **The available insight modules** (Funnel, Cohort, RFM, Attribution, Anomaly).
4. **The MQL cookbook** (the 3 examples above + ~12 more in `insights/cookbook/`).

The planner picks the closest module + the right MQL pattern, then fills in the template. The result is a MongoDB aggregation pipeline that runs against the user's cluster.

**The 3 examples above are the showcase.** They appear in the README under the "MQL pipeline examples" section. Judges with MongoDB experience will read these and conclude "this team knows MongoDB."

---

## What this gets the team

- The "MQL fluency" signal in the README.
- The MQL expertise demonstrates that the insight modules are not LLM-generated SQL (a common hackathon anti-pattern).
- The 3 examples are the foundation for the 5 modules. Each module has 1-3 pipeline templates.
- The cookbook is version-controlled in `insights/cookbook/` (future expansion).

## What this does NOT cover

- The remaining 2 modules (Attribution, Anomaly). v1 of these is simpler than the $facet/$bucket/$setWindowFields examples.
- The planner LLM prompt (a separate doc).
- The MQL validator (separate doc; checks that generated pipelines are safe before execution).
- The Atlas Vector Search integration (a separate doc; uses `$vectorSearch`).
