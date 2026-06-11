"use client";

import { motion } from "framer-motion";

/**
 * Shared header treatment for the connect → onboarding flow.
 * Asymmetric left-aligned, Syne display heading, no gradient text.
 */
export function FlowHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      {eyebrow && (
        <div className="mb-3 flex items-center gap-2 text-xs font-medium tracking-wider uppercase text-argus-accent">
          {eyebrow}
        </div>
      )}
      <h1 className="font-heading text-[2rem] font-bold leading-tight tracking-tight text-argus-text">
        {title}
      </h1>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-argus-text-muted max-w-prose">
          {description}
        </p>
      )}
    </motion.header>
  );
}
