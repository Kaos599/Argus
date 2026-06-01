"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The standard Argus card surface. Used by every card component so the
 * visual treatment is consistent (per research/17-theming.md § Border radius,
 * § Shadows, § Spacing).
 */
export function Card({
  title,
  children,
  className,
  toolbar,
  flush = false,
  surface = "elevated",
  ariaLabel,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  toolbar?: ReactNode;
  flush?: boolean;
  surface?: "elevated" | "sunken" | "transparent";
  ariaLabel?: string;
}) {
  return (
    <section
      aria-label={typeof title === "string" ? title : ariaLabel}
      className={cn(
        "flex h-full w-full flex-col rounded-md border text-argus-text",
        surface === "elevated" && "border-argus-border bg-argus-bg-elevated",
        surface === "sunken" && "border-argus-border bg-argus-bg-sunken",
        surface === "transparent" && "border-argus-border bg-transparent",
        className,
      )}
    >
      {(title || toolbar) && (
        <header className="flex items-start justify-between gap-2 border-b border-argus-border px-4 py-3">
          {title && (
            <h3 className="text-base font-semibold leading-tight text-argus-text">
              {title}
            </h3>
          )}
          {toolbar && <div className="flex items-center gap-1">{toolbar}</div>}
        </header>
      )}
      <div className={cn("flex-1", flush ? "" : "p-4")}>{children}</div>
    </section>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col rounded-md border border-argus-border bg-argus-bg-elevated",
        className,
      )}
      aria-busy
      aria-live="polite"
    >
      <div className="border-b border-argus-border px-4 py-3">
        <div className="h-4 w-1/3 animate-pulse rounded bg-argus-bg-sunken" />
      </div>
      <div className="flex-1 p-4">
        <div className="h-full w-full animate-pulse rounded bg-argus-bg-sunken" />
      </div>
    </div>
  );
}
