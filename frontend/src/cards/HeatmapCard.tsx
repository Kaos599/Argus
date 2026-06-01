"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { HeatmapCardPropsType } from "@/types/api";

function colorRamp(t: number, diverging: boolean): string {
  // 0..1
  const x = Math.max(0, Math.min(1, t));
  if (diverging) {
    // blue (cold) → light → red (hot)
    if (x < 0.5) {
      const k = x * 2;
      return `rgb(${Math.round(59 + (255 - 59) * k)}, ${Math.round(130 + (255 - 130) * k)}, ${Math.round(246 + (255 - 246) * k)})`;
    }
    const k = (x - 0.5) * 2;
    return `rgb(255, ${Math.round(255 - 130 * k)}, ${Math.round(255 - 150 * k)})`;
  }
  // sequential: very light gray → deep blue
  const r = Math.round(243 - 187 * x);
  const g = Math.round(244 - 198 * x);
  const b = Math.round(246 - 161 * x);
  return `rgb(${r}, ${g}, ${b})`;
}

function formatCell(v: number, fmt: HeatmapCardPropsType["cellFormat"]): string {
  if (fmt === "percent") return `${v.toFixed(1)}%`;
  if (fmt === "usd") return `$${v.toLocaleString("en-US")}`;
  if (Math.abs(v) >= 1000) return v.toLocaleString("en-US");
  if (!Number.isInteger(v)) return v.toFixed(2);
  return v.toString();
}

export function HeatmapCard({
  title,
  rowLabels,
  colLabels,
  values,
  colorScale = "sequential",
  colorDomain,
  cellFormat = "count",
  showRowLabels = true,
  showColLabels = true,
}: HeatmapCardPropsType) {
  const { min, max, diverging } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const row of values) {
      for (const v of row) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    if (colorDomain) {
      lo = colorDomain[0];
      hi = colorDomain[1];
    }
    const isDiverging = colorScale === "diverging";
    return { min: lo, max: hi, diverging: isDiverging };
  }, [values, colorScale, colorDomain]);

  const range = max - min || 1;

  return (
    <Card title={title} flush>
      <div className="h-full w-full overflow-auto p-3">
        <table
          className="w-full border-collapse text-xs"
          role="grid"
          aria-label={title ?? "Heatmap"}
        >
          <thead>
            <tr>
              {showRowLabels && <th className="w-24" aria-label="Row labels" />}
              {colLabels.map((c, i) => (
                <th
                  key={i}
                  className="px-1 py-1 text-center font-medium text-argus-text-muted"
                  scope="col"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowLabels.map((rowLabel, ri) => (
              <tr key={ri}>
                {showRowLabels && (
                  <th
                    scope="row"
                    className="pr-2 text-right font-medium text-argus-text-muted"
                  >
                    {rowLabel}
                  </th>
                )}
                {colLabels.map((_, ci) => {
                  const v = values[ri]?.[ci] ?? 0;
                  const t = (v - min) / range;
                  const bg = colorRamp(t, diverging);
                  const isDark = t > 0.55;
                  return (
                    <td
                      key={ci}
                      className={cn(
                        "h-8 min-w-[40px] border border-argus-border text-center font-mono tabular-nums",
                        isDark ? "text-white" : "text-argus-text",
                      )}
                      style={{ background: bg }}
                      title={`${rowLabel} × ${colLabels[ci]}: ${formatCell(v, cellFormat)}`}
                    >
                      {formatCell(v, cellFormat)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
