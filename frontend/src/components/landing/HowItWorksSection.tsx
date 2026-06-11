"use client";

import { motion } from "framer-motion";

const MQL_EXAMPLE = `// Funnel: signups, activations, revenue — one round-trip
db.users.aggregate([
  { $match: {
    signup_date: {
      $gte: {
        $dateSubtract: {
          startDate: "$$NOW", unit: "day", amount: 7
        }
      }
    }
  }},
  { $facet: {
    "signups":    [{ $count: "count" }],
    "activations":[{ $match: { activated: true } },
                   { $count: "count" }],
    "revenue":   [{ $match: { first_purchase_at: { $exists: true }}},
                  { $group: { _id: null, total: { $sum: "$first_purchase_amount" }}}],
    "by_country":[{ $group: { _id: "$country", count: { $sum: 1 }}},
                  { $sort: { count: -1 }}, { $limit: 10 }]
  }}
])`;

const TICKER_LINES = [
  { prefix: "→", text: "probing cluster0.mongodb.net", detail: "3 collections found", color: "text-argus-text-muted" },
  { prefix: "→", text: "sampling users … 100 docs", detail: "7 nested fields", color: "text-argus-text-muted" },
  { prefix: "→", text: "sampling events … 100 docs", detail: "50 k total · event_type has 12 values", color: "text-argus-text-muted" },
  { prefix: "→", text: "sampling orders … 100 docs", detail: "schema: { userId, total, status, items[] }", color: "text-argus-text-muted" },
  { prefix: "✓", text: "schema mapped", detail: "planner ready", color: "text-argus-accent" },
  { prefix: "→", text: "proposing 3 insight modules", detail: "Funnel · RFM · Cohort", color: "text-argus-text-muted" },
  { prefix: "✓", text: "cards streaming …", detail: "", color: "text-argus-accent" },
];

const STEPS = [
  {
    num: "01",
    title: "Connect",
    body: "Paste a MongoDB connection string. Argus probes the cluster, confirms read-only access, and enumerates collections in under 3 seconds.",
  },
  {
    num: "02",
    title: "Schema sampling",
    body: "The agent samples 100 documents per collection to build a live schema map — no introspection tools, no pre-existing knowledge of your data model.",
  },
  {
    num: "03",
    title: "Agent proposes insights",
    body: "Based on the schema, the planner LLM selects the 3–5 most appropriate insight modules and emits a ranked proposal. You confirm or discard each.",
  },
  {
    num: "04",
    title: "Cards stream in",
    body: "Each card is rendered by a typed React component — StatCard, TimeSeriesCard, BarChartCard, HeatmapCard — not an LLM-generated SVG or iframe.",
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-widest text-argus-text-subtle mb-6">
      {children}
    </p>
  );
}

export function HowItWorksSection() {
  return (
    <section className="relative border-b border-argus-border">
      <div className="mx-auto max-w-screen-xl px-6 py-24">
        <SectionLabel>How it works</SectionLabel>

        {/* Step grid */}
        <div className="grid md:grid-cols-2 gap-x-16 gap-y-0">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.35, ease: "easeOut", delay: i * 0.07 }}
              className="flex gap-5 py-8 border-t border-argus-border first-of-type:border-t-0 [&:nth-child(2)]:border-t-0 md:[&:nth-child(2)]:border-t"
            >
              <span className="font-mono text-xs text-argus-text-subtle pt-0.5 flex-shrink-0 w-6">
                {step.num}
              </span>
              <div>
                <h3 className="font-heading text-lg font-semibold text-argus-text">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-argus-text-muted">
                  {step.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Schema ticker terminal */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mt-16 rounded border border-argus-border-strong bg-argus-bg-sunken overflow-hidden"
        >
          <div className="flex items-center gap-2 border-b border-argus-border px-4 py-2.5">
            <span className="font-mono text-[10px] text-argus-text-subtle">
              argus — agent trace
            </span>
          </div>
          <div className="p-4 space-y-1.5">
            {TICKER_LINES.map((line, i) => (
              <div key={i} className="flex gap-3 font-mono text-xs">
                <span className={`flex-shrink-0 ${line.color}`}>{line.prefix}</span>
                <span className="text-argus-text-muted">{line.text}</span>
                {line.detail && (
                  <span className="text-argus-text-subtle">{line.detail}</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* MQL code block */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          className="mt-8 rounded border border-argus-border-strong overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2 border-b border-argus-border bg-argus-bg-sunken px-4 py-2.5">
            <span className="font-mono text-[10px] text-argus-text-subtle">
              Funnel pipeline · $facet — actual MQL executed against your cluster
            </span>
            <span className="font-mono text-[10px] text-argus-accent">
              MongoDB 5.0+
            </span>
          </div>
          <pre className="overflow-x-auto p-4 bg-argus-bg-elevated">
            <code className="font-mono text-xs text-argus-text-muted leading-relaxed">
              {MQL_EXAMPLE}
            </code>
          </pre>
        </motion.div>
      </div>
    </section>
  );
}
