'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { EASE_OUT_EXPO, STAGGER_ITEM } from '@/lib/motion';

const steps = [
  { n: 1, label: 'Paste your Atlas URI' },
  { n: 2, label: 'Argus probes your cluster' },
  { n: 3, label: 'Samples your schemas' },
  { n: 4, label: 'Picks what matters' },
  { n: 5, label: 'Drafts your dashboard' },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: STAGGER_ITEM },
  },
};

const stepVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE_OUT_EXPO },
  },
};

export function HowItWorks() {
  const lineRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(lineRef, { once: true, margin: '-80px' });

  return (
    <section className="w-full px-6 py-20 md:py-28 bg-white border-t border-argus-border/30">
      <div className="mx-auto max-w-6xl">
        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          className="font-heading text-3xl font-semibold leading-tight text-argus-ink md:text-4xl mb-16 text-center"
        >
          Paste a connection string. Get a dashboard in 2–3 minutes.
        </motion.h2>

        {/* Timeline */}
        <div ref={lineRef} className="relative">
          {/* Connecting hairline — desktop */}
          <div className="hidden md:block absolute top-5 left-0 right-0 h-px bg-argus-border z-0" />
          {/* Filling overlay */}
          <motion.div
            className="hidden md:block absolute top-5 left-0 h-px bg-argus-primary z-10 origin-left"
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 1.2, ease: EASE_OUT_EXPO, delay: 0.2 }}
            style={{ right: 0 }}
          />

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="relative z-20 grid grid-cols-1 gap-8 md:grid-cols-5"
          >
            {steps.map(({ n, label }) => (
              <motion.div
                key={n}
                variants={stepVariants}
                className="flex flex-col items-center gap-3 text-center"
              >
                {/* Node */}
                <div className="flex h-10 w-10 min-w-[40px] items-center justify-center rounded-full border-2 border-argus-primary bg-argus-bg-elevated">
                  <span className="font-mono text-sm font-bold tabular-nums text-argus-primary">
                    {n}
                  </span>
                </div>
                <p className="text-sm font-medium leading-snug text-argus-text">{label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Footnote */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 text-center text-xs text-argus-text-subtle"
        >
          Honest timing: ~20 seconds of machine work — the rest is you reviewing drafts.
        </motion.p>
      </div>
    </section>
  );
}
