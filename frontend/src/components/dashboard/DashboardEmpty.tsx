"use client";

import Link from "next/link";

/**
 * Empty state for the dashboard when no cards exist.
 * Uses a CSS dot-grid illustration — no images, no emojis.
 */
export function DashboardEmpty() {
  return (
    <div
      className="relative flex flex-col items-center justify-center overflow-hidden rounded-[var(--argus-radius-lg)] border border-dashed border-argus-border bg-argus-bg-elevated/50 px-6 py-20 text-center"
      role="region"
      aria-label="Empty dashboard"
    >
      {/* Dot-grid illustration (CSS only) */}
      <DotGrid />

      {/* Eye icon tile */}
      <div
        className="relative z-10 mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--argus-radius-md)] border border-argus-border bg-argus-bg-elevated"
        aria-hidden
      >
        {/* Simple SVG eye — no emoji, no gradient fill */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-argus-accent"
          aria-hidden
        >
          <path
            d="M1 10C1 10 4 4 10 4C16 4 19 10 19 10C19 10 16 16 10 16C4 16 1 10 1 10Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>

      <h2
        className="relative z-10 font-heading text-lg font-semibold text-argus-text"
        style={{ fontFamily: "var(--argus-font-heading)" }}
      >
        No cards yet
      </h2>
      <p className="relative z-10 mt-2 max-w-xs text-sm leading-relaxed text-argus-text-muted">
        Connect a database and Argus will propose insights — funnel, cohort, RFM,
        attribution, and anomaly cards materialize automatically.
      </p>

      <div className="relative z-10 mt-7 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/connect"
          className="inline-flex h-10 items-center rounded-[var(--argus-radius-md)] bg-argus-accent px-5 text-sm font-semibold text-argus-bg transition-colors duration-150 hover:opacity-90 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-argus-accent focus-visible:ring-offset-2"
        >
          Connect a database
        </Link>
        <Link
          href="/onboarding"
          className="inline-flex h-10 items-center rounded-[var(--argus-radius-md)] border border-argus-border bg-argus-bg-elevated px-5 text-sm text-argus-text-muted transition-colors duration-150 hover:border-argus-text-muted hover:text-argus-text active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-argus-accent focus-visible:ring-offset-2"
        >
          Run onboarding
        </Link>
      </div>
    </div>
  );
}

/**
 * Pure-CSS dot grid — conveys "data / observation" without images.
 * Low opacity so content reads over it.
 */
function DotGrid() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden
      style={{
        backgroundImage: `radial-gradient(circle, var(--argus-border-strong) 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
        maskImage:
          "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)",
        opacity: 0.7,
      }}
    />
  );
}
