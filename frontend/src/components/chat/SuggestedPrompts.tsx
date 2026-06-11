"use client";

interface SuggestedPromptsProps {
  suggestions: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

const PROMPT_LABELS: Record<string, string> = {
  "Drop the users collection": "destructive",
};

export function SuggestedPrompts({ suggestions, onSelect, disabled }: SuggestedPromptsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested prompts">
      {suggestions.map((s) => {
        const isDestructive = PROMPT_LABELS[s] === "destructive" ||
          s.toLowerCase().includes("drop") ||
          s.toLowerCase().includes("delete");
        return (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(s)}
            className={
              isDestructive
                ? "inline-flex min-h-[40px] items-center rounded-[8px] border border-argus-danger/30 bg-argus-danger-bg/20 px-3 py-1.5 font-mono text-[11px] text-argus-danger transition-colors hover:border-argus-danger/60 hover:bg-argus-danger-bg/40 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40"
                : "inline-flex min-h-[40px] items-center rounded-[8px] border border-argus-border bg-argus-bg-elevated px-3 py-1.5 font-mono text-[11px] text-argus-text-muted transition-colors hover:border-argus-accent/50 hover:text-argus-accent active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40"
            }
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}
