"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Staged ticker lines that appear during the render phase.
 * "inspecting users … 7 nested fields" style.
 * Staggered reveals, honest timing framing.
 *
 * Pass `lines` as they arrive from the stream — each new entry
 * appends below with a staggered entrance.
 */
export function AgentTicker({ lines }: { lines: string[] }) {
  return (
    <div
      className="rounded-[10px] border border-argus-border bg-argus-bg-sunken px-4 py-3 font-mono text-xs"
      aria-live="polite"
      aria-label="Agent activity"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-argus-accent" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-argus-text-subtle">
          Agent log
        </span>
      </div>
      <ul className="space-y-1 max-h-48 overflow-y-auto">
        <AnimatePresence initial={false}>
          {lines.map((line, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18, delay: 0 }}
              className="flex items-start gap-2 text-argus-text-muted"
            >
              <span className="mt-px flex-shrink-0 text-argus-accent" aria-hidden>›</span>
              <span className="leading-relaxed tabular-nums">{line}</span>
            </motion.li>
          ))}
        </AnimatePresence>
        {lines.length === 0 && (
          <li className="text-argus-text-subtle italic">Initializing…</li>
        )}
      </ul>
    </div>
  );
}

/**
 * Simulated ticker for the "agent is exploring" phase before
 * real stream events arrive. Produces staged discovery messages.
 */
export function useSimulatedTicker(active: boolean): string[] {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (!active) {
      setLines([]);
      return;
    }
    const MESSAGES = [
      "connecting to cluster…",
      "enumerating collections…",
      "sampling users collection — 100 docs",
      "inspecting users … 7 nested fields",
      "sampling orders collection — 100 docs",
      "3 time-series patterns detected in orders",
      "sampling events collection — 100 docs",
      "funnel candidate: events.type → orders.created",
      "sampling products collection — 100 docs",
      "RFM candidate: orders × customers",
      "running planner — estimating 2–3 min total",
    ];
    let i = 0;
    const timer = setInterval(() => {
      if (i < MESSAGES.length) {
        setLines((prev) => [...prev, MESSAGES[i]]);
        i++;
      } else {
        clearInterval(timer);
      }
    }, 550);
    return () => clearInterval(timer);
  }, [active]);

  return lines;
}
