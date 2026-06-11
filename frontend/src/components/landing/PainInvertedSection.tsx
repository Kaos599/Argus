"use client";

import { motion } from "framer-motion";

export function PainInvertedSection() {
  return (
    <section className="border-b border-argus-border">
      <div className="mx-auto max-w-screen-xl px-6 py-24">
        <p className="font-mono text-[10px] uppercase tracking-widest text-argus-text-subtle mb-10">
          The problem
        </p>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Left: pain */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded border border-argus-border bg-argus-bg-elevated px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-argus-text-subtle">
              Static dashboard
            </div>
            <h2 className="font-heading text-2xl md:text-3xl leading-tight text-argus-text-muted">
              Your admin dashboard answers the questions
              <br className="hidden md:block" /> you wrote{" "}
              <span className="line-through decoration-argus-border-strong">last sprint.</span>
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-argus-text-subtle max-w-sm">
              You hardcoded a DAU chart in January. It&apos;s June. The schema changed
              three times. The chart still says &ldquo;Daily Active Users&rdquo; even though
              the events collection was renamed.
            </p>
          </motion.div>

          {/* Right: inverted */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded border border-argus-border bg-argus-bg-elevated px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-argus-accent">
              Argus
            </div>
            <h2 className="font-heading text-2xl md:text-3xl leading-tight text-argus-text">
              Argus asks its own questions.
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-argus-text-muted max-w-sm">
              No predefined charts. No field names hardcoded in JSX. The agent
              reads the live schema on every session and proposes what&apos;s worth
              watching today — not what was worth watching last sprint.
            </p>

            {/* Contrast bullet */}
            <div className="mt-8 space-y-3">
              {[
                ["Static dashboard", "Knows your schema from deployment day"],
                ["Argus", "Samples your schema every session"],
              ].map(([label, text]) => (
                <div
                  key={label}
                  className="flex items-start gap-3 rounded border border-argus-border bg-argus-bg-elevated px-3 py-2.5"
                >
                  <span
                    className={`font-mono text-[10px] pt-0.5 flex-shrink-0 uppercase tracking-wider ${
                      label === "Argus"
                        ? "text-argus-accent"
                        : "text-argus-text-subtle line-through"
                    }`}
                  >
                    {label}
                  </span>
                  <span className="text-xs text-argus-text-muted">{text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
