"use client";

import { useState } from "react";
import { ChevronDown, ShieldAlert, ShieldCheck, Eye, UserX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const RISK_ICONS = [ShieldAlert, Eye, ShieldCheck, UserX, UserX];

/**
 * Compact "What you should know" disclosure block.
 * 5 risks shown as a tight scannable list; collapsible details
 * preserve all text. No wall of paragraphs.
 */
export function RiskDisclosure({ risks }: { risks: string[] }) {
  const [open, setOpen] = useState(false);

  // Short labels extracted from the risk text
  const SHORT_LABELS = [
    "Read-only by design — but still treat the string as sensitive.",
    "Connection string held in memory; never persisted or sent to browser.",
    "Recommend a dedicated read-only Atlas user (readAnyDatabase).",
    "No API auth in v1 — don't share the dashboard URL.",
    "PII fields are not redacted in v1. Use a sandbox cluster.",
  ];

  return (
    <div className="rounded-[10px] border border-argus-border overflow-hidden">
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-argus-bg-sunken/60"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-argus-text-muted">
          What you should know
          <span className="ml-2 rounded-[4px] bg-argus-bg-sunken px-1.5 py-0.5 font-mono text-[10px] text-argus-text-subtle">
            5 points
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          className="flex-shrink-0 text-argus-text-subtle"
        >
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </motion.span>
      </button>

      {/* Short list — always visible */}
      <ul className="border-t border-argus-border divide-y divide-argus-border/50">
        {SHORT_LABELS.map((label, i) => {
          const Icon = RISK_ICONS[i] ?? ShieldAlert;
          return (
            <li
              key={i}
              className="flex items-start gap-3 px-4 py-2.5 text-xs leading-relaxed text-argus-text-muted"
            >
              <Icon
                className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-argus-accent"
                aria-hidden
              />
              <span>{label}</span>
            </li>
          );
        })}
      </ul>

      {/* Expanded detail — full risk text */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <ul className="border-t border-argus-border bg-argus-bg-sunken/60 space-y-0 divide-y divide-argus-border/50">
              {risks.map((r, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 px-4 py-2.5 text-[11px] leading-relaxed text-argus-text-muted"
                >
                  <span
                    className="mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[3px] border border-argus-border font-mono text-[9px] text-argus-text-subtle"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Three-layer read-only assurance — one line per layer, stated calmly.
 */
export function ReadOnlyAssurance() {
  const LAYERS = [
    "MCP server runs in read-only mode — no write tools exposed.",
    "Planner blocks $out and $merge stages before they reach MongoDB.",
    "We recommend a read-only Atlas user (readAnyDatabase).",
  ];

  return (
    <div className="flex items-start gap-3 rounded-[10px] border border-argus-accent/20 bg-argus-accent/[0.03] px-4 py-3">
      <ShieldCheck
        className="mt-0.5 h-4 w-4 flex-shrink-0 text-argus-accent"
        aria-hidden
      />
      <div>
        <p className="text-xs font-semibold text-argus-accent">
          Read-only by design — three layers of protection
        </p>
        <ul className="mt-1.5 space-y-0.5">
          {LAYERS.map((l, i) => (
            <li key={i} className="text-[11px] text-argus-text-muted">
              {l}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
