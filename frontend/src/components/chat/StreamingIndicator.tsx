"use client";

import { useEffect, useState } from "react";

const STAGES = [
  "Connecting to cluster…",
  "Parsing your question…",
  "Building pipeline…",
  "Querying documents…",
  "Aggregating results…",
  "Formatting response…",
];

export function StreamingIndicator() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, STAGES.length - 1));
    }, 900);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Argus is working"
      className="flex items-center gap-3 py-2"
    >
      {/* Eye marker — matches agent message structure */}
      <div className="flex w-[52px] flex-shrink-0 flex-col items-center gap-1 pt-1">
        <div
          className="flex h-5 w-5 items-center justify-center rounded-full border border-argus-accent/40 bg-argus-accent/10"
          aria-hidden
        >
          {/* Animated pupil */}
          <div className="h-1.5 w-1.5 rounded-full bg-argus-accent [animation:pulse_1.4s_ease-in-out_infinite]" />
        </div>
        <div className="h-full w-px bg-argus-border" />
      </div>

      <div className="min-w-0 flex-1 pb-1">
        <div className="inline-flex items-center gap-2 rounded-[6px] border border-argus-border bg-argus-bg-elevated px-3 py-1.5">
          {/* Three-dot ticker */}
          <div className="flex items-center gap-[3px]" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1 w-1 rounded-full bg-argus-accent"
                style={{
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
          <span className="font-mono text-[11px] tabular-nums text-argus-text-muted">
            {STAGES[stageIndex]}
          </span>
        </div>
      </div>
    </div>
  );
}
