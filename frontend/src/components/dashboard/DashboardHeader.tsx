"use client";

import { Plus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  cardCount: number;
  refreshing: boolean;
  onRefresh: () => void;
  onToggleAddCard: () => void;
  showAddCard: boolean;
}

export function DashboardHeader({
  cardCount,
  refreshing,
  onRefresh,
  onToggleAddCard,
  showAddCard,
}: DashboardHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1
          className="font-heading text-xl font-semibold tracking-tight text-argus-text"
          style={{ fontFamily: "var(--argus-font-heading)" }}
        >
          Dashboard
        </h1>
        <p
          className="mt-0.5 font-mono text-[12px] tabular-nums text-argus-text-subtle"
          style={{ fontFamily: "var(--argus-font-mono)" }}
          aria-live="polite"
          aria-label={`${cardCount} card${cardCount === 1 ? "" : "s"} on dashboard`}
        >
          {cardCount} {cardCount === 1 ? "card" : "cards"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Refresh */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label={refreshing ? "Refreshing dashboard data" : "Refresh dashboard data"}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-[var(--argus-radius-md)] border border-argus-border bg-argus-bg-elevated px-3.5 text-sm text-argus-text-muted",
            "transition-colors duration-150 hover:border-argus-text-muted hover:text-argus-text",
            "active:scale-[0.96]",
            "disabled:cursor-not-allowed disabled:opacity-40",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-argus-accent focus-visible:ring-offset-2",
          )}
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
            aria-hidden
            style={refreshing ? { animationDuration: "0.8s" } : undefined}
          />
          <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
        </button>

        {/* Add card */}
        <button
          type="button"
          onClick={onToggleAddCard}
          aria-expanded={showAddCard}
          aria-label={showAddCard ? "Close add card panel" : "Add a new card to the dashboard"}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-[var(--argus-radius-md)] px-3.5 text-sm font-semibold",
            "bg-argus-accent text-argus-bg",
            "transition-colors duration-150 hover:opacity-90",
            "active:scale-[0.96]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-argus-accent focus-visible:ring-offset-2",
          )}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          <span>Add card</span>
        </button>
      </div>
    </div>
  );
}
