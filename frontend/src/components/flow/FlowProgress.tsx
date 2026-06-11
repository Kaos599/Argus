"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared multi-step progress indicator for the onboarding flow.
 * 1px borders, no glow shadows, left-to-right horizontal bar.
 */
export function FlowProgress({
  steps,
  current,
}: {
  steps: readonly string[];
  current: number;
}) {
  return (
    <nav aria-label="Onboarding progress">
      <ol className="flex items-center gap-0">
        {steps.map((label, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          const upcoming = n > current;

          return (
            <li key={label} className="flex flex-1 items-center">
              {/* Step node */}
              <div className="flex flex-col items-center gap-1.5">
                <motion.div
                  initial={false}
                  animate={{
                    scale: active ? 1.05 : 1,
                  }}
                  transition={{ duration: 0.18 }}
                  className={cn(
                    "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[6px] border text-[10px] font-bold transition-colors duration-200",
                    done &&
                      "border-argus-accent bg-argus-accent text-argus-primary-fg",
                    active &&
                      "border-argus-accent bg-transparent text-argus-accent",
                    upcoming &&
                      "border-argus-border bg-transparent text-argus-text-subtle",
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? (
                    <Check className="h-3 w-3" aria-hidden />
                  ) : (
                    n
                  )}
                </motion.div>
                <span
                  className={cn(
                    "hidden sm:block text-[10px] leading-tight whitespace-nowrap",
                    active
                      ? "font-semibold text-argus-text"
                      : "text-argus-text-subtle",
                  )}
                >
                  {label}
                </span>
              </div>

              {/* Connector */}
              {i < steps.length - 1 && (
                <div
                  className="relative mx-2 h-px flex-1"
                  aria-hidden
                >
                  <div className="absolute inset-0 bg-argus-border" />
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-argus-accent"
                    initial={false}
                    animate={{ width: done ? "100%" : "0%" }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
