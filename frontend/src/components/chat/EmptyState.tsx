"use client";

import { SuggestedPrompts } from "./SuggestedPrompts";

interface EmptyStateProps {
  suggestions: string[];
  onSelectPrompt: (prompt: string) => void;
}

export function EmptyState({ suggestions, onSelectPrompt }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col justify-center py-12">
      {/* Observatory eye mark */}
      <div className="mb-8 flex items-center gap-3">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-argus-accent/30 bg-argus-accent/5">
          <div className="h-3 w-3 rounded-full border border-argus-accent/60 bg-argus-accent/20" />
          <div className="absolute h-1.5 w-1.5 rounded-full bg-argus-accent" />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold text-argus-text">
            Argus is watching
          </h2>
          <p className="text-sm text-argus-text-muted">
            Ask anything about your MongoDB data. Read-only by design.
          </p>
        </div>
      </div>

      {/* Feature hints */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          {
            label: "Natural language",
            detail: "Write queries in plain English. Argus builds the MQL pipeline.",
          },
          {
            label: "Visual results",
            detail: "Answers render as charts, tables, and summaries — not just text.",
          },
          {
            label: "Three-layer protection",
            detail: "Try asking to drop a collection. See why Argus can never write.",
          },
          {
            label: "Full schema awareness",
            detail: "Argus sampled your collections on connect. It knows your shape.",
          },
        ].map((hint) => (
          <div
            key={hint.label}
            className="rounded-[10px] border border-argus-border bg-argus-bg-elevated px-4 py-3"
          >
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-argus-accent">
              {hint.label}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-argus-text-muted">{hint.detail}</p>
          </div>
        ))}
      </div>

      {/* Suggested prompts */}
      <div>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-argus-text-subtle">
          Try one of these
        </p>
        <SuggestedPrompts suggestions={suggestions} onSelect={onSelectPrompt} />
      </div>
    </div>
  );
}
