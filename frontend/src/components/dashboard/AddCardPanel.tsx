"use client";

import { cn } from "@/lib/utils";
import type { AddCardRequestType } from "@/types/api";

const MODULES = [
  { id: "funnel" as const, label: "Funnel", description: "Conversion drop-off" },
  { id: "cohort" as const, label: "Cohort", description: "Retention by cohort" },
  { id: "rfm" as const, label: "RFM", description: "Recency / Frequency / Monetary" },
  { id: "attribution" as const, label: "Attribution", description: "Traffic sources" },
  { id: "anomaly" as const, label: "Anomaly", description: "Outlier detection" },
] satisfies Array<{ id: AddCardRequestType["module"]; label: string; description: string }>;

interface AddCardPanelProps {
  onAdd: (module: AddCardRequestType["module"]) => void;
}

export function AddCardPanel({ onAdd }: AddCardPanelProps) {
  return (
    <div
      className="mb-6 rounded-[var(--argus-radius-lg)] border border-argus-border bg-argus-bg-elevated p-4"
      role="region"
      aria-label="Add card panel"
    >
      <p
        className="text-sm font-semibold text-argus-text"
        style={{ fontFamily: "var(--argus-font-heading)" }}
        id="add-card-label"
      >
        Add an insight card
      </p>
      <p className="mt-0.5 text-xs text-argus-text-muted">
        The planner will generate a card from your live data.
      </p>

      <ul
        className="mt-3 flex flex-wrap gap-2"
        aria-labelledby="add-card-label"
        role="list"
      >
        {MODULES.map(({ id, label, description }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onAdd(id)}
              title={description}
              aria-label={`Add ${label} card — ${description}`}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-[var(--argus-radius-sm)] border border-argus-border bg-argus-bg px-3 text-xs font-medium text-argus-text-muted",
                "transition-colors duration-150 hover:border-argus-accent hover:text-argus-accent",
                "active:scale-[0.96]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-argus-accent focus-visible:ring-offset-1",
              )}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
