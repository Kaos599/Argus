'use client';

import { motion } from 'framer-motion';
import { BarChart2, DatabaseZap, EyeOff } from 'lucide-react';
import { EASE_OUT_EXPO, STAGGER_ITEM } from '@/lib/motion';

const problems = [
  {
    icon: BarChart2,
    title: 'You hardcoded it',
    body: 'Every chart on your admin panel is a chart someone had time to build.',
  },
  {
    icon: DatabaseZap,
    title: 'Your data outgrew it',
    body: 'New collections, new fields, new questions. The dashboard stayed frozen.',
  },
  {
    icon: EyeOff,
    title: 'You stopped looking',
    body: "If checking a metric means writing an aggregation, you won’t check it.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: STAGGER_ITEM,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE_OUT_EXPO },
  },
};

export function ProblemStrip() {
  return (
    <section className="w-full px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          className="font-heading text-3xl font-semibold leading-tight text-argus-ink md:text-4xl mb-12 text-center"
        >
          Your dashboard only answers the questions you predicted.
        </motion.h2>

        {/* Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 gap-5 md:grid-cols-3"
        >
          {problems.map(({ icon: Icon, title, body }) => (
            <motion.div
              key={title}
              variants={itemVariants}
              className="rounded-2xl border border-argus-border bg-argus-bg-elevated p-6 shadow-[var(--argus-shadow-md)] hover:shadow-[var(--argus-shadow-lg)] transition-shadow duration-300"
            >
              <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-argus-primary-soft p-2.5 text-argus-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-argus-ink mb-2">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-argus-text-muted">{body}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Closer line */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.3 }}
          className="mt-14 text-center text-lg font-medium leading-relaxed text-argus-ink"
        >
          Argus flips it: the agent reads your schema, decides what&apos;s interesting, and draws it.
        </motion.p>
      </div>
    </section>
  );
}
