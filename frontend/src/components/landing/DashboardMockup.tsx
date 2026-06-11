"use client";

import { StatCard } from "@/cards/StatCard";
import { TimeSeriesCard } from "@/cards/TimeSeriesCard";
import { BarChartCard } from "@/cards/BarChartCard";
import { useEffect, useState } from "react";

const CARDS = [
  {
    id: "stat",
    component: "stat" as const,
  },
  {
    id: "timeseries",
    component: "timeseries" as const,
  },
  {
    id: "bar",
    component: "bar" as const,
  },
];

function generatePoints(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return {
      t: d.toISOString(),
      v: 18 + Math.round(Math.sin(i / 2.5) * 7 + (Math.random() * 4)),
    };
  });
}

export function DashboardMockup() {
  const [visible, setVisible] = useState<string[]>([]);

  useEffect(() => {
    // Stagger card appearance to simulate streaming
    const timers: ReturnType<typeof setTimeout>[] = [];
    CARDS.forEach((c, i) => {
      timers.push(
        setTimeout(() => {
          setVisible((prev) => [...prev, c.id]);
        }, 600 + i * 350),
      );
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative rounded border border-argus-border-strong bg-argus-bg-elevated overflow-hidden">
      {/* Mock title bar */}
      <div className="flex items-center gap-2 border-b border-argus-border px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-argus-border-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-argus-border-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-argus-border-strong" />
        </div>
        <span className="ml-2 font-mono text-[10px] text-argus-text-subtle">
          argus_demo — dashboard
        </span>
        <span className="ml-auto inline-flex items-center gap-1 font-mono text-[9px] text-argus-accent">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-argus-accent" aria-hidden />
          live
        </span>
      </div>

      {/* Schema ticker */}
      <div className="border-b border-argus-border bg-argus-bg-sunken px-4 py-2 font-mono text-[10px] text-argus-text-subtle">
        <span className="text-argus-accent">✓</span> inspecting{" "}
        <span className="text-argus-text-muted">users</span> … 7 nested fields
        {"  "}
        <span className="text-argus-accent">✓</span> inspecting{" "}
        <span className="text-argus-text-muted">events</span> … 50 k docs
        {"  "}
        <span className="text-argus-accent">✓</span> inspecting{" "}
        <span className="text-argus-text-muted">orders</span> … schema mapped
      </div>

      {/* Cards */}
      <div className="p-3 space-y-3">
        {/* Stat card */}
        <div
          className="transition-[opacity,transform] duration-500"
          style={{
            opacity: visible.includes("stat") ? 1 : 0,
            transform: visible.includes("stat") ? "translateY(0)" : "translateY(8px)",
          }}
        >
          <div className="h-[90px]">
            <StatCard
              label="Total users"
              value={1000}
              unit="count"
              delta={47}
              deltaWindow="week"
              trend="up"
            />
          </div>
        </div>

        {/* Time series card */}
        <div
          className="transition-[opacity,transform] duration-500"
          style={{
            opacity: visible.includes("timeseries") ? 1 : 0,
            transform: visible.includes("timeseries")
              ? "translateY(0)"
              : "translateY(8px)",
          }}
        >
          <div className="h-[160px]">
            <TimeSeriesCard
              title="Daily signups"
              series={[
                {
                  name: "Signups",
                  color: "primary",
                  points: generatePoints(21),
                },
              ]}
              granularity="day"
              showAnomalies={false}
            />
          </div>
        </div>

        {/* Bar chart card */}
        <div
          className="transition-[opacity,transform] duration-500"
          style={{
            opacity: visible.includes("bar") ? 1 : 0,
            transform: visible.includes("bar") ? "translateY(0)" : "translateY(8px)",
          }}
        >
          <div className="h-[140px]">
            <BarChartCard
              title="Top countries"
              orientation="horizontal"
              bars={[
                { label: "US", value: 412, color: "primary" },
                { label: "IN", value: 198, color: "primary" },
                { label: "GB", value: 87, color: "primary" },
                { label: "DE", value: 73, color: "primary" },
              ]}
              sortBy="value-desc"
              showValues
            />
          </div>
        </div>
      </div>
    </div>
  );
}
