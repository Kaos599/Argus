"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

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
        "flex h-full w-full flex-col rounded-[10px] text-argus-text transition-shadow duration-300",
        surface === "elevated" && "border border-argus-border bg-argus-bg-elevated shadow-sm hover:shadow-md",
        surface === "sunken" && "border border-argus-border bg-argus-bg-sunken",
        surface === "transparent" && "border border-argus-border bg-transparent",
        "dark:shadow-none",
        className,
      )}
    >
      {(title || toolbar) && (
        <header className="flex items-start justify-between gap-2 border-b border-argus-border px-5 py-3.5">
          {title && typeof title === "string" ? (
            <h3 className="font-heading text-base font-semibold leading-tight text-argus-text">
              {title}
            </h3>
          ) : (
            title
          )}
          {toolbar && <div className="flex items-center gap-1">{toolbar}</div>}
        </header>
      )}
      <div className={cn("flex-1", flush ? "" : "p-5")}>{children}</div>
    </section>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col rounded-[10px] border border-argus-border bg-argus-bg-elevated",
        className,
      )}
      aria-busy
      aria-live="polite"
    >
      <div className="border-b border-argus-border px-5 py-3.5">
        <div className="h-4 w-1/3 animate-pulse rounded bg-argus-bg-sunken" />
      </div>
      <div className="flex-1 p-5">
        <div className="h-full w-full animate-pulse rounded bg-argus-bg-sunken" />
      </div>
    </div>
  );
}
