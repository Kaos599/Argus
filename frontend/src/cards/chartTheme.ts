/**
 * Shared chart theme constants for all Argus chart cards.
 * Import from here instead of defining inline to keep chart styling consistent.
 */

export const chartPalette = [
  "var(--argus-chart-1)",
  "var(--argus-chart-2)",
  "var(--argus-chart-3)",
  "var(--argus-chart-4)",
  "var(--argus-chart-5)",
] as const;

export const axisProps = {
  tick: {
    fontSize: 11,
    fill: "var(--argus-chart-tick)",
    fontFamily: "var(--font-jetbrains-mono), monospace",
  },
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
} as const;

/** Solid hairlines, never dashed */
export const gridProps = {
  stroke: "var(--argus-chart-grid)",
  vertical: false,
} as const;

export const tooltipCursor = {
  stroke: "var(--argus-border-strong)",
  strokeWidth: 1,
} as const;

/** Compact number formatter — e.g. 12000 → "12K" */
export const compactNumber = new Intl.NumberFormat("en", { notation: "compact" });
