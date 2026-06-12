"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/motion";

export interface AgentTickerProps {
  messages: string[];
  active?: boolean;
  interval?: number;
  className?: string;
}

/**
 * AgentTicker — cycles through log-style messages in a single fixed line.
 *
 * - Rotates messages every `interval` ms while `active` is true.
 * - Stops and holds the final message when `active` flips false or messages run out.
 * - AnimatePresence fade+slide-up entry; reduced-motion: plain swap.
 * - Fixed line height prevents layout shift.
 * - Leading ▸ pulse dot while active; stops when inactive.
 */
export function AgentTicker({
  messages,
  active = true,
  interval = 1250,
  className,
}: AgentTickerProps) {
  const prefersReduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  // When the messages array identity changes, restart from index 0.
  const prevMessagesRef = useRef(messages);
  useEffect(() => {
    if (prevMessagesRef.current !== messages) {
      prevMessagesRef.current = messages;
      setIndex(0);
    }
  }, [messages]);

  // Advance index on interval while active and not at the last message.
  useEffect(() => {
    if (!active || messages.length <= 1) return;
    const id = setInterval(() => {
      setIndex((prev) => {
        const next = prev + 1;
        if (next >= messages.length) {
          clearInterval(id);
          return messages.length - 1;
        }
        return next;
      });
    }, interval);
    return () => clearInterval(id);
  }, [active, messages, interval]);

  const current = messages[index] ?? "";

  const enterVariants = prefersReduced
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.35, ease: EASE_OUT_EXPO },
        },
        exit: { opacity: 0, transition: { duration: 0.15 } },
      };

  return (
    <div
      className={cn(
        // Fixed height so layout never shifts — matches leading-none + 1rem text-xs
        "flex items-center gap-1.5 overflow-hidden",
        // Reserve exactly one line of text-xs (12px * 1.5 line-height = 18px)
        "h-[18px]",
        className,
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Leading indicator */}
      <span
        className={cn(
          "shrink-0 text-argus-primary text-[10px] leading-none select-none",
          active && "animate-[status-pulse_1.5s_ease-in-out_infinite]",
        )}
        aria-hidden
      >
        ▸
      </span>

      {/* Message area */}
      <div className="relative min-w-0 flex-1 overflow-hidden">
        {prefersReduced ? (
          <span className="block truncate font-mono text-xs text-argus-text-muted tabular-nums leading-[18px]">
            {current}
          </span>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={current}
              {...enterVariants}
              className="block truncate font-mono text-xs text-argus-text-muted tabular-nums leading-[18px]"
            >
              {current}
            </motion.span>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
