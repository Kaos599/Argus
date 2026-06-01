import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine class names with Tailwind-aware conflict resolution.
 * Per the project's Tailwind conventions: use this everywhere, never template-string classes.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a number according to its unit (per research/14-zod-schemas.md).
 * Used by StatCard, BarChartCard, TableCard.
 */
export function formatStatValue(
  value: number,
  unit?: string,
  options: { compact?: boolean } = {},
): string {
  const { compact = false } = options;
  const formatter = new Intl.NumberFormat("en-US", {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: unit === "percent" ? 1 : 0,
  });
  const formatted = formatter.format(value);

  switch (unit) {
    case "percent":
      return `${formatted}%`;
    case "usd":
    case "eur":
    case "gbp":
      return `${unit.toUpperCase()} ${formatted}`;
    case "days":
      return `${formatted}d`;
    case "hours":
      return `${formatted}h`;
    case "count":
    case "":
    case undefined:
      return formatted;
    default:
      return formatted;
  }
}

/**
 * Format a number as a signed delta with an arrow.
 * e.g. +12%, -3%, 0%
 */
export function formatDelta(
  value: number,
  options: { asPercent?: boolean } = {},
): string {
  const { asPercent = false } = options;
  const sign = value > 0 ? "+" : value < 0 ? "" : "";
  const display = asPercent
    ? `${Math.abs(value).toFixed(1)}%`
    : Math.abs(value).toLocaleString("en-US");
  return `${sign}${value < 0 ? "-" : ""}${display}`;
}

/**
 * Stable date formatter for time-series x-axis ticks.
 */
export function formatDateTick(
  iso: string,
  granularity: "hour" | "day" | "week" | "month" = "day",
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  switch (granularity) {
    case "hour":
      return d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" });
    case "day":
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    case "week":
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    case "month":
      return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
}

/**
 * Pick a chart color token name → CSS variable.
 */
export function chartColorVar(name: string | undefined): string {
  switch (name) {
    case "primary":
      return "var(--argus-primary)";
    case "secondary":
      return "var(--argus-secondary)";
    case "success":
      return "var(--argus-accent)";
    case "warning":
      return "var(--argus-warning)";
    case "danger":
      return "var(--argus-danger)";
    default:
      return "var(--argus-primary)";
  }
}

/**
 * Convert a value to a CSV string and trigger a download.
 */
export function downloadCSV(filename: string, rows: Record<string, unknown>[]): void {
  if (rows.length === 0) return;
  const columns = Object.keys(rows[0] as Record<string, unknown>);
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = [
    columns.join(","),
    ...rows.map((r) => columns.map((c) => escape(r[c])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
