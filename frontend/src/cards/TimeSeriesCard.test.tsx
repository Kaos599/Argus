import { render } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { TimeSeriesCard } from "./TimeSeriesCard";

const baseSeries = [
  {
    name: "users",
    color: "primary" as const,
    points: [
      { t: "2024-01-01T00:00:00Z", v: 10 },
      { t: "2024-01-02T00:00:00Z", v: 11 },
      { t: "2024-01-03T00:00:00Z", v: 12 },
      { t: "2024-01-04T00:00:00Z", v: 5000 },
      { t: "2024-01-05T00:00:00Z", v: 11 },
      { t: "2024-01-06T00:00:00Z", v: 12 },
      { t: "2024-01-07T00:00:00Z", v: 11 },
    ],
  },
];

beforeAll(() => {
  // Recharts ResponsiveContainer + ResizeObserver don't work in jsdom without shims.
  Element.prototype.getBoundingClientRect = function () {
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 800,
      bottom: 400,
      width: 800,
      height: 400,
      toJSON() {},
    } as DOMRect;
  };
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe("TimeSeriesCard — anomaly marker rendering", () => {
  it("renders no anomaly markers when showAnomalies is false", () => {
    const { container } = render(
      <div style={{ width: 800, height: 400 }}>
        <TimeSeriesCard title="DAU" series={baseSeries} showAnomalies={false} />
      </div>,
    );
    const refLines = container.querySelectorAll(".recharts-reference-line");
    expect(refLines.length).toBe(0);
  });

  it("renders one reference line per anomaly when showAnomalies is true", () => {
    const { container } = render(
      <div style={{ width: 800, height: 400 }}>
        <TimeSeriesCard title="DAU" series={baseSeries} showAnomalies={true} />
      </div>,
    );
    const refLines = container.querySelectorAll(".recharts-reference-line");
    // 5000 is the only outlier (mean ~724, std ~1746, threshold 2*std ≈ 3491).
    expect(refLines.length).toBeGreaterThanOrEqual(1);
    expect(refLines.length).toBeLessThanOrEqual(2);
  });
});
