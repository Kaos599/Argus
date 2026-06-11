"use client";

import { motion } from "framer-motion";

const LAYERS = [
  {
    num: "01",
    title: "MDB_MCP_READ_ONLY=true",
    description:
      "The MCP subprocess is launched with the read-only flag set. Write tools (insertOne, updateMany, deleteMany, drop, createIndex) are stripped from the tool manifest before the agent ever sees them.",
    detail: "src/mcp/spawn.ts · line 42",
  },
  {
    num: "02",
    title: "Read-only database user",
    description:
      "Onboarding guides you to create a MongoDB Atlas database user with the built-in read role. Even if the MCP layer were bypassed, the database rejects write attempts at the protocol level.",
    detail: "Atlas → Database Access → Built-in Role: Read",
  },
  {
    num: "03",
    title: "$out and $merge blocked at plan time",
    description:
      "The argus-result-set-guard inspects every generated aggregation pipeline before execution. Stages that write to disk ($out, $merge) raise a ReadOnlyViolationError — the pipeline never reaches MongoDB.",
    detail: "src/guards/result_set_guard.py · line 18",
  },
];

const REFUSAL_CARD = {
  query: "drop the users collection",
  response:
    "I can't do that — Argus is read-only by design. Three layers of write protection make this impossible: the MCP server runs with MDB_MCP_READ_ONLY=true, your database user has only read permissions, and the result_set_guard blocks $out/$merge at compile time.",
  badge: "Write refused · READ_ONLY_VIOLATION",
};

export function TrustSection() {
  return (
    <section className="border-b border-argus-border">
      <div className="mx-auto max-w-screen-xl px-6 py-24">
        <p className="font-mono text-[10px] uppercase tracking-widest text-argus-text-subtle mb-6">
          Write protection
        </p>
        <h2 className="font-heading text-3xl md:text-4xl leading-tight text-argus-text max-w-xl">
          Three independent layers.
          <br />
          All must fail for a write to occur.
        </h2>
        <p className="mt-4 text-sm text-argus-text-muted max-w-md leading-relaxed">
          Connecting a third-party tool to a production cluster is a considered
          decision. Argus documents each protection layer precisely so you can
          audit it.
        </p>

        {/* Three-layer list */}
        <div className="mt-12 space-y-0 divide-y divide-argus-border border-t border-argus-border">
          {LAYERS.map((layer, i) => (
            <motion.div
              key={layer.num}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.35,
                ease: "easeOut",
                delay: i * 0.07,
              }}
              className="grid md:grid-cols-[80px_1fr_1fr] gap-6 py-8"
            >
              <span className="font-mono text-xs text-argus-text-subtle self-start pt-0.5">
                Layer {layer.num}
              </span>
              <div>
                <h3 className="font-mono text-sm text-argus-text">
                  {layer.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-argus-text-muted">
                  {layer.description}
                </p>
              </div>
              <div className="self-start">
                <span className="font-mono text-[10px] text-argus-text-subtle">
                  {layer.detail}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Refusal card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mt-14 rounded border border-argus-border-strong bg-argus-bg-elevated overflow-hidden"
        >
          <div className="border-b border-argus-border bg-argus-bg-sunken px-4 py-2.5 flex items-center gap-2">
            <span className="font-mono text-[10px] text-argus-text-subtle">
              Chat session — live refusal example
            </span>
          </div>
          <div className="p-5 space-y-4">
            {/* User message */}
            <div className="flex gap-3">
              <span className="font-mono text-[10px] text-argus-text-subtle pt-0.5 flex-shrink-0 uppercase tracking-wider">
                You
              </span>
              <span className="text-sm text-argus-text-muted font-mono">
                {REFUSAL_CARD.query}
              </span>
            </div>
            {/* Agent response */}
            <div className="flex gap-3">
              <span className="font-mono text-[10px] text-argus-accent pt-0.5 flex-shrink-0 uppercase tracking-wider">
                Argus
              </span>
              <div>
                <p className="text-sm text-argus-text-muted leading-relaxed">
                  {REFUSAL_CARD.response}
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded border border-argus-danger/30 bg-argus-danger-bg px-2.5 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-argus-danger flex-shrink-0" aria-hidden />
                  <span className="font-mono text-[10px] text-argus-danger">
                    {REFUSAL_CARD.badge}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
