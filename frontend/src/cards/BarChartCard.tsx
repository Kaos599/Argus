"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { chartColorVar, cn } from "@/lib/utils";
import type { BarChartCardPropsType } from "@/types/api";

type BarDatum = { label: string; value: number; color?: string };

function sortBars(bars: BarChartCardPropsType["bars"], sortBy: BarChartCardPropsType["sortBy"]): BarDatum[] {
  const copy = [...bars];
  switch (sortBy) {
    case "value-asc":
      return copy.sort((a, b) => a.value - b.value);
    case "label-asc":
      return copy.sort((a, b) => a.label.localeCompare(b.label));
    case "value-desc":
    default:
      return copy.sort((a, b) => b.value - a.value);
  }
}

export function BarChartCard({
  title,
  orientation = "vertical",
  bars,
  xAxisLabel,
  yAxisLabel,
  sortBy = "value-desc",
  showValues = true,
}: BarChartCardPropsType) {
  const sorted = sortBars(bars, sortBy);
  const isVertical = orientation === "vertical";

  return (
    <Card title={title} flush>
      <div className="h-full w-full p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            layout={isVertical ? "horizontal" : "vertical"}
            margin={{ top: 12, right: 16, bottom: 12, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--argus-border)"
              vertical={isVertical}
              horizontal={!isVertical}
            />
            {isVertical ? (
              <>
                <XAxis
                  dataKey="label"
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
              </>
            ) : (
              <>
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "var(--argus-text-muted)" }}
                  stroke="var(--argus-border-strong)"
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  tick={{ fontSize: 11, fill: "var(--argus-text-muted)" }}
                  stroke="var(--argus-border-strong)"
                  width={80}
                />
              </>
            )}
            <Tooltip
              cursor={{ fill: "var(--argus-bg-sunken)", opacity: 0.5 }}
              contentStyle={{
                background: "var(--argus-bg-elevated)",
                border: "1px solid var(--argus-border-strong)",
                borderRadius: 6,
                color: "var(--argus-text)",
                fontSize: 12,
              }}
            />
            <Bar dataKey="value" isAnimationActive={false} radius={[3, 3, 0, 0]}>
              {sorted.map((b, i) => (
                <Cell
                  key={i}
                  fill={chartColorVar(b.color)}
                  className={cn(showValues ? "" : "")}
                />
              ))}
              {showValues && (
                <LabelList
                  dataKey="value"
                  position={isVertical ? "top" : "right"}
                  fill="var(--argus-text-muted)"
                  fontSize={11}
                />
              )}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
