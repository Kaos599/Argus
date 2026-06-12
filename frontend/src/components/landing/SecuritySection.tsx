'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Check } from 'lucide-react';
import { EASE_OUT_EXPO, SPRING } from '@/lib/motion';

const layers = [
  'The MCP server runs read-only. Write tools never even load.',
  'We connect with a read-only database user. Even a bug can\'t write.',
  'The query planner blocks $out and $merge before anything reaches MongoDB.',
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.18 },
  },
};

const checkVariants = {
  hidden: { opacity: 0, scale: 0.25 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: SPRING,
  },
};

const lineVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { ...SPRING, delay: 0.05 },
  },
};

export function SecuritySection() {
  return (
    <section className="w-full px-6 py-20 md:py-28 bg-argus-landing-bg border-t border-argus-border/30">
      <div className="mx-auto max-w-6xl">
        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          className="font-heading text-3xl font-semibold leading-tight text-argus-ink md:text-4xl mb-4 text-center"
        >
          Ask it to drop a collection. Watch it refuse.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.1 }}
          className="text-center text-base text-argus-text-muted mb-14 max-w-xl mx-auto"
        >
          Argus ships with three layers of read-only protection — so you can point it at production on day one.
        </motion.p>

        {/* Mock chat panel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: EASE_OUT_EXPO, delay: 0.15 }}
          className="mx-auto max-w-2xl rounded-2xl bg-white shadow-[0_2px_4px_rgba(0,0,0,0.04),0_12px_40px_rgba(0,0,0,0.09)] overflow-hidden border border-argus-border"
        >
          {/* Chrome bar */}
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-argus-border bg-argus-bg-elevated">
            <span className="h-3 w-3 rounded-full bg-argus-border-strong" />
            <span className="h-3 w-3 rounded-full bg-argus-border-strong" />
            <span className="h-3 w-3 rounded-full bg-argus-border-strong" />
            <span className="ml-3 text-xs font-mono text-argus-text-subtle">Argus Chat</span>
          </div>

          <div className="p-5 flex flex-col gap-4">
            {/* User bubble */}
            <div className="flex justify-end">
              <div className="rounded-2xl rounded-br-sm bg-argus-primary px-4 py-2.5 max-w-[75%]">
                <p className="text-sm font-medium text-white">drop the users collection</p>
              </div>
            </div>

            {/* Refusal card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, ease: EASE_OUT_EXPO, delay: 0.3 }}
              className="rounded-xl border border-argus-border bg-white p-4 shadow-[var(--argus-shadow-sm)]"
            >
              {/* Status chip */}
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-argus-success-bg px-2.5 py-1 text-xs font-semibold text-argus-success">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Blocked: write operation
                </span>
              </div>
              <p className="text-sm font-semibold text-argus-ink mb-1">
                Argus is read-only by design
              </p>
              <p className="text-xs text-argus-text-muted mb-4">
                This request was stopped before it reached your database. Here&apos;s why:
              </p>

              {/* Staggered layer checklist */}
              <motion.ul
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="flex flex-col gap-2.5"
              >
                {layers.map((layer, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <motion.span
                      variants={checkVariants}
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-argus-success-bg text-argus-success"
                    >
                      <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                    </motion.span>
                    <motion.p variants={lineVariants} className="text-sm leading-relaxed text-argus-text">
                      {layer}
                    </motion.p>
                  </li>
                ))}
              </motion.ul>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
