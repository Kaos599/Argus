"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { chartColorVar, cn, formatDateTick } from "@/lib/utils";
import type { TimeSeriesCardPropsType } from "@/types/api";

type CombinedPoint = { t: number; iso: string; [seriesName: string]: number | string };

function buildData(series: TimeSeriesCardPropsType["series"]): CombinedPoint[] {
  const byTime = new Map<number, CombinedPoint>();
  for (const s of series) {
    for (const p of s.points) {
      const ts = new Date(p.t).getTime();
      if (Number.isNaN(ts)) continue;
      const existing =
        byTime.get(ts) ?? ({ t: ts, iso: p.t } as CombinedPoint);
      existing[s.name] = p.v;
      byTime.set(ts, existing);
    }
  }
  return Array.from(byTime.values()).sort((a, b) => a.t - b.t);
}

function meanAndStd(values: number[]): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

function findAnomalies(
  data: CombinedPoint[],
  seriesName: string,
): Set<number> {
  const values = data.map((d) => Number(d[seriesName])).filter((v) => !Number.isNaN(v));
  const { mean, std } = meanAndStd(values);
  if (std === 0) return new Set();
  const anomalyTs = new Set<number>();
  for (const d of data) {
    const v = Number(d[seriesName]);
    if (Number.isNaN(v)) continue;
    if (Math.abs(v - mean) > 2 * std) anomalyTs.add(d.t);
  }
  return anomalyTs;
}

export function TimeSeriesCard({
  title,
  series,
  xAxisLabel,
  yAxisLabel,
  granularity = "day",
  showAnomalies = false,
}: TimeSeriesCardPropsType) {
  const data = buildData(series);
  const anomalySets = showAnomalies
    ? series.map((s) => ({ name: s.name, set: findAnomalies(data, s.name) }))
    : [];

  return (
    <Card title={title} flush>
      <div className="h-full w-full p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--argus-border)"
              vertical={false}
            />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => formatDateTick(new Date(v).toISOString(), granularity)}
              tick={{ fontSize: 11, fill: "var(--argus-text-muted)" }}
              stroke="var(--argus-border-strong)"
              label={
                xAxisLabel
                  ? {
                      value: xAxisLabel,
                      position: "insideBottom",
                      offset: -4,
                      fill: "var(--argus-text-muted)",
                      fontSize: 11,
                    }
                  : undefined
              }
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--argus-text-muted)" }}
              stroke="var(--argus-border-strong)"
              label={
                yAxisLabel
                  ? {
                      value: yAxisLabel,
                      angle: -90,
                      position: "insideLeft",
                      fill: "var(--argus-text-muted)",
                      fontSize: 11,
                    }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{
                background: "var(--argus-bg-elevated)",
                border: "1px solid var(--argus-border-strong)",
                borderRadius: 6,
                color: "var(--argus-text)",
                fontSize: 12,
              }}
              labelFormatter={(v) => formatDateTick(new Date(Number(v)).toISOString(), granularity)}
            />
            {series.map((s) => (
              <Line
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={chartColorVar(s.color)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ))}
            {showAnomalies &&
              anomalySets.flatMap(({ name, set }) =>
                Array.from(set).map((ts) => {
                  const point = data.find((d) => d.t === ts);
                  if (!point) return null;
                  return (
                    <ReferenceLine
                      key={`${name}-${ts}`}
                      x={ts}
                      stroke="var(--argus-danger)"
                      strokeWidth={1}
                      strokeDasharray="2 2"
                      opacity={0.5}
                      className={cn("recharts-reference-line")}
                    />
                  );
                }),
              )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
