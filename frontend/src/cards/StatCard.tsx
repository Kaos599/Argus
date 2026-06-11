"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn, formatStatValue } from "@/lib/utils";
import type { StatCardPropsType } from "@/types/api";

export function StatCard({
  label,
  value,
  unit,
  delta,
  deltaWindow,
  trend,
  comparisonText,
}: StatCardPropsType) {
  const computedTrend: "up" | "down" | "flat" =
    trend ??
    (delta === undefined ? "flat" : delta > 0 ? "up" : delta < 0 ? "down" : "flat");

  const TrendIcon =
    computedTrend === "up" ? ArrowUp : computedTrend === "down" ? ArrowDown : Minus;
  const trendColor =
    computedTrend === "up"
      ? "text-argus-accent"
      : computedTrend === "down"
        ? "text-argus-danger"
        : "text-argus-text-muted";

  return (
    <Card>
      <div className="flex h-full flex-col justify-center">
        <p className="text-sm font-medium text-argus-text-muted">{label}</p>
        <p
          className="mt-2 font-heading text-4xl font-bold tracking-tight text-argus-text tabular-nums"
          data-testid="stat-value"
        >
          {formatStatValue(value, unit, { compact: Math.abs(value) >= 10_000 })}
        </p>
        {(delta !== undefined || comparisonText) && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            {delta !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-mono tabular-nums",
                  trendColor,
                )}
                aria-label={`Trend ${computedTrend}`}
              >
                <TrendIcon className="h-3.5 w-3.5" aria-hidden />
                {delta > 0 ? "+" : ""}
                {formatStatValue(delta, unit === "percent" ? "percent" : undefined)}
                {deltaWindow && (
                  <span className="text-argus-text-subtle">
                    {" "}
                    vs last {deltaWindow}
                  </span>
                )}
              </span>
            )}
            {comparisonText && !deltaWindow && (
              <span className="text-argus-text-subtle">{comparisonText}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
