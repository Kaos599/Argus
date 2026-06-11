"use client";

import { motion } from "framer-motion";

const MODULES = [
  {
    id: "funnel",
    label: "Funnel",
    size: "large",
    description:
      "Signups → Activations → Revenue in a single $facet aggregation. Conversion rates calculated at each step with period-over-period comparison.",
    mql: "$facet",
    stat: "68%",
    statLabel: "activation rate",
    trend: "+4pp",
    trendUp: true,
  },
  {
    id: "cohort",
    label: "Cohort",
    size: "medium",
    description:
      "7-day rolling retention by acquisition week using $setWindowFields — a MongoDB 5.0+ feature that eliminates 3× the round-trips of a traditional $lookup approach.",
    mql: "$setWindowFields",
    stat: "42%",
    statLabel: "D7 retention",
    trend: "-1pp",
    trendUp: false,
  },
  {
    id: "rfm",
    label: "RFM",
    size: "medium",
    description:
      "Recency, Frequency, Monetary segmentation via $bucket with fixed spend boundaries. Champions, Loyal, At-Risk, Dormant — automatically scored.",
    mql: "$bucket",
    stat: "12%",
    statLabel: "champions",
    trend: "+2pp",
    trendUp: true,
  },
  {
    id: "attribution",
    label: "Attribution",
    size: "small",
    description:
      "First-touch and last-touch attribution across UTM sources with time-decay weighting.",
    mql: "$lookup",
    stat: "34%",
    statLabel: "organic",
    trend: null,
    trendUp: null,
  },
  {
    id: "anomaly",
    label: "Anomaly",
    size: "small",
    description:
      "Z-score detection (>2σ) on key metrics. Flagged calmly, not in red banners — just a reference line on the chart.",
    mql: "$setWindowFields",
    stat: "1",
    statLabel: "anomaly this week",
    trend: "Tuesday −47%",
    trendUp: false,
  },
];

export function InsightModulesSection() {
  return (
    <section className="border-b border-argus-border">
      <div className="mx-auto max-w-screen-xl px-6 py-24">
        <p className="font-mono text-[10px] uppercase tracking-widest text-argus-text-subtle mb-6">
          Insight modules
        </p>
        <div className="flex items-end gap-8 mb-12">
          <h2 className="font-heading text-3xl md:text-4xl leading-tight text-argus-text max-w-lg">
            Five lenses on your data.
            <br />
            Every one backed by real MQL.
          </h2>
          <p className="hidden md:block text-sm text-argus-text-muted max-w-xs leading-relaxed mb-1">
            The agent selects modules based on your schema, not a preset
            template. Each module runs one aggregation pipeline.
          </p>
        </div>

        {/* Asymmetric grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-auto">
          {/* Large: Funnel — spans 2 cols */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="md:col-span-2 rounded border border-argus-border bg-argus-bg-elevated p-6 flex flex-col justify-between min-h-[200px]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-argus-accent">
                    {MODULES[0].label}
                  </span>
                  <span className="font-mono text-[10px] text-argus-border-strong">·</span>
                  <span className="font-mono text-[10px] text-argus-text-subtle">
                    {MODULES[0].mql}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-argus-text-muted max-w-md">
                  {MODULES[0].description}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-heading text-4xl font-semibold text-argus-text tabular-nums">
                  {MODULES[0].stat}
                </div>
                <div className="font-mono text-[10px] text-argus-text-subtle mt-0.5">
                  {MODULES[0].statLabel}
                </div>
                {MODULES[0].trend && (
                  <div
                    className={`font-mono text-xs mt-1 ${
                      MODULES[0].trendUp ? "text-argus-accent" : "text-argus-danger"
                    }`}
                  >
                    {MODULES[0].trend}
                  </div>
                )}
              </div>
            </div>

            {/* Funnel visualisation bars */}
            <div className="mt-6 space-y-2">
              {[
                { label: "Signups", value: 100, pct: 100 },
                { label: "Activations", value: 68, pct: 68 },
                { label: "Purchases", value: 24, pct: 24 },
              ].map((bar) => (
                <div key={bar.label} className="flex items-center gap-3">
                  <span className="w-20 font-mono text-[10px] text-argus-text-subtle text-right flex-shrink-0">
                    {bar.label}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-argus-bg-sunken overflow-hidden">
                    <div
                      className="h-full rounded-full bg-argus-accent transition-[width] duration-700"
                      style={{ width: `${bar.pct}%`, opacity: 0.6 + bar.pct * 0.004 }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-argus-text-subtle w-8 text-right">
                    {bar.pct}%
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Cohort — right col, top */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.07 }}
            className="rounded border border-argus-border bg-argus-bg-elevated p-5 flex flex-col min-h-[200px]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-argus-text-muted">
                {MODULES[1].label}
              </span>
              <span className="font-mono text-[10px] text-argus-border-strong">·</span>
              <span className="font-mono text-[10px] text-argus-text-subtle">
                {MODULES[1].mql}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-argus-text-muted flex-1">
              {MODULES[1].description}
            </p>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="font-heading text-3xl font-semibold text-argus-text tabular-nums">
                  {MODULES[1].stat}
                </div>
                <div className="font-mono text-[10px] text-argus-text-subtle">
                  {MODULES[1].statLabel}
                </div>
              </div>
              {MODULES[1].trend && (
                <span className={`font-mono text-xs ${MODULES[1].trendUp ? "text-argus-accent" : "text-argus-danger"}`}>
                  {MODULES[1].trend}
                </span>
              )}
            </div>
          </motion.div>

          {/* RFM */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
            className="rounded border border-argus-border bg-argus-bg-elevated p-5 flex flex-col min-h-[160px]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-argus-text-muted">
                {MODULES[2].label}
              </span>
              <span className="font-mono text-[10px] text-argus-border-strong">·</span>
              <span className="font-mono text-[10px] text-argus-text-subtle">
                {MODULES[2].mql}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-argus-text-muted flex-1">
              {MODULES[2].description}
            </p>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="font-heading text-3xl font-semibold text-argus-text tabular-nums">
                  {MODULES[2].stat}
                </div>
                <div className="font-mono text-[10px] text-argus-text-subtle">
                  {MODULES[2].statLabel}
                </div>
              </div>
              {MODULES[2].trend && (
                <span className={`font-mono text-xs ${MODULES[2].trendUp ? "text-argus-accent" : "text-argus-danger"}`}>
                  {MODULES[2].trend}
                </span>
              )}
            </div>
          </motion.div>

          {/* Attribution */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.14 }}
            className="rounded border border-argus-border bg-argus-bg-elevated p-5 flex flex-col min-h-[160px]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-argus-text-muted">
                {MODULES[3].label}
              </span>
              <span className="font-mono text-[10px] text-argus-border-strong">·</span>
              <span className="font-mono text-[10px] text-argus-text-subtle">
                {MODULES[3].mql}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-argus-text-muted flex-1">
              {MODULES[3].description}
            </p>
            <div className="mt-4">
              <div className="font-heading text-3xl font-semibold text-argus-text tabular-nums">
                {MODULES[3].stat}
              </div>
              <div className="font-mono text-[10px] text-argus-text-subtle">
                {MODULES[3].statLabel}
              </div>
            </div>
          </motion.div>

          {/* Anomaly */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.18 }}
            className="rounded border border-argus-border bg-argus-bg-elevated p-5 flex flex-col min-h-[160px]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-argus-text-muted">
                {MODULES[4].label}
              </span>
              <span className="font-mono text-[10px] text-argus-border-strong">·</span>
              <span className="font-mono text-[10px] text-argus-text-subtle">
                {MODULES[4].mql}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-argus-text-muted flex-1">
              {MODULES[4].description}
            </p>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="font-heading text-3xl font-semibold text-argus-text tabular-nums">
                  {MODULES[4].stat}
                </div>
                <div className="font-mono text-[10px] text-argus-text-subtle">
                  {MODULES[4].statLabel}
                </div>
              </div>
              {MODULES[4].trend && (
                <span className="font-mono text-[10px] text-argus-warning">
                  {MODULES[4].trend}
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
