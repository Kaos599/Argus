"use client";

import { type ReactNode, useState } from "react";
import { RefreshCw, X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export function Card({
  title,
  children,
  className,
  toolbar,
  flush = false,
  surface = "elevated",
  ariaLabel,
  onRefresh,
  onRemove,
  lastUpdated,
  isDraggable = false,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  toolbar?: ReactNode;
  flush?: boolean;
  surface?: "elevated" | "sunken" | "transparent";
  ariaLabel?: string;
  onRefresh?: () => void;
  onRemove?: () => void;
  lastUpdated?: Date | string;
  isDraggable?: boolean;
}) {
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await Promise.resolve(onRefresh());
    } finally {
      // Brief delay so the spin animation completes gracefully
      setTimeout(() => setRefreshing(false), 600);
    }
  }

  const formattedTime = lastUpdated
    ? typeof lastUpdated === "string"
      ? lastUpdated
      : lastUpdated.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : null;

  const hasQuietToolbar = onRefresh || onRemove || lastUpdated;

  return (
    <section
      aria-label={typeof title === "string" ? title : ariaLabel}
      className={cn(
        // Base layout
        "group/card relative flex h-full w-full flex-col overflow-hidden",
        // Radius — concentric: outer card gets radius-lg, inner content gets radius-md (padding compensates)
        "rounded-[var(--argus-radius-lg)]",
        // Border — 1px, no decorative shadow in default state
        "border border-argus-border",
        // Surface colors
        surface === "elevated" && "bg-argus-bg-elevated",
        surface === "sunken" && "bg-argus-bg-sunken",
        surface === "transparent" && "bg-transparent",
        // Text
        "text-argus-text",
        // Hover elevation — shadow only on hover, not default
        "transition-shadow duration-200 hover:shadow-[var(--argus-shadow-md)]",
        // Drag lifted state — react-grid-layout adds .react-draggable-dragging
        "[.react-draggable-dragging_&]:scale-[1.015] [.react-draggable-dragging_&]:shadow-[var(--argus-shadow-lg)]",
        className,
      )}
    >
      {/* Drag handle — visible on hover, always keyboard-accessible */}
      {isDraggable && (
        <div
          className={cn(
            "card-drag-handle absolute left-0 top-0 z-10 flex h-6 w-full cursor-move items-center justify-center",
            "opacity-0 transition-opacity duration-150 group-hover/card:opacity-100",
          )}
          role="button"
          tabIndex={0}
          aria-label="Drag to reorder card"
          title="Drag to reorder"
        >
          <GripVertical
            className="h-3.5 w-3.5 text-argus-text-subtle"
            aria-hidden
          />
        </div>
      )}

      {/* Card header */}
      {(title || toolbar || hasQuietToolbar) && (
        <header
          className={cn(
            "flex items-center justify-between gap-2 border-b border-argus-border px-4 py-3",
            isDraggable && "pt-5",
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {title && typeof title === "string" ? (
              <h3
                className="truncate text-sm font-semibold leading-snug text-argus-text"
                style={{ fontFamily: "var(--argus-font-heading)" }}
              >
                {title}
              </h3>
            ) : (
              title
            )}
          </div>

          {/* Right side: explicit toolbar + quiet auto-toolbar */}
          <div className="flex shrink-0 items-center gap-1">
            {/* Custom toolbar (always visible) */}
            {toolbar && (
              <div className="flex items-center gap-1">{toolbar}</div>
            )}

            {/* Last-updated timestamp */}
            {formattedTime && (
              <span
                className="font-mono text-[10px] text-argus-text-subtle tabular-nums opacity-0 transition-opacity duration-150 group-hover/card:opacity-100"
                style={{ fontFamily: "var(--argus-font-mono)" }}
                title={`Last updated: ${formattedTime}`}
                aria-label={`Last updated at ${formattedTime}`}
              >
                {formattedTime}
              </span>
            )}

            {/* Refresh button */}
            {onRefresh && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                aria-label="Refresh card data"
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-[4px] text-argus-text-subtle",
                  "opacity-0 transition-opacity duration-150 group-hover/card:opacity-100",
                  "hover:bg-argus-bg-sunken hover:text-argus-text",
                  "active:scale-[0.96]",
                  "disabled:cursor-not-allowed disabled:opacity-30",
                  "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-argus-accent",
                )}
              >
                <RefreshCw
                  className={cn("h-3 w-3", refreshing && "animate-spin")}
                  aria-hidden
                  style={{ animationDuration: "0.6s" }}
                />
              </button>
            )}

            {/* Remove button */}
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                aria-label="Remove card from dashboard"
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-[4px] text-argus-text-subtle",
                  "opacity-0 transition-opacity duration-150 group-hover/card:opacity-100",
                  "hover:bg-argus-danger-bg hover:text-argus-danger",
                  "active:scale-[0.96]",
                  "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-argus-accent",
                )}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            )}
          </div>
        </header>
      )}

      {/* Card body — inner radius slightly smaller than outer (concentric) */}
      <div
        className={cn(
          "min-h-0 flex-1",
          flush ? "overflow-hidden" : "overflow-auto p-4",
        )}
      >
        {children}
      </div>
    </section>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col rounded-[var(--argus-radius-lg)] border border-argus-border bg-argus-bg-elevated overflow-hidden",
        className,
      )}
      aria-busy
      aria-live="polite"
      aria-label="Loading card"
      role="status"
    >
      {/* Shimmer header */}
      <div className="flex items-center gap-3 border-b border-argus-border px-4 py-3">
        <div
          className="h-3.5 w-2/5 rounded-[4px]"
          style={{
            background:
              "linear-gradient(90deg, var(--argus-bg-sunken) 0%, var(--argus-border-strong) 50%, var(--argus-bg-sunken) 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.6s ease-in-out infinite",
          }}
        />
      </div>
      {/* Shimmer body */}
      <div className="flex-1 p-4 flex flex-col gap-3">
        <div
          className="h-24 w-full rounded-[6px]"
          style={{
            background:
              "linear-gradient(90deg, var(--argus-bg-sunken) 0%, var(--argus-border-strong) 50%, var(--argus-bg-sunken) 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.6s ease-in-out infinite 0.1s",
          }}
        />
        <div
          className="h-3 w-3/5 rounded-[4px]"
          style={{
            background:
              "linear-gradient(90deg, var(--argus-bg-sunken) 0%, var(--argus-border-strong) 50%, var(--argus-bg-sunken) 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.6s ease-in-out infinite 0.2s",
          }}
        />
        <div
          className="h-3 w-1/2 rounded-[4px]"
          style={{
            background:
              "linear-gradient(90deg, var(--argus-bg-sunken) 0%, var(--argus-border-strong) 50%, var(--argus-bg-sunken) 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.6s ease-in-out infinite 0.3s",
          }}
        />
      </div>
    </div>
  );
}
