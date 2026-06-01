import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { SummaryCard } from "./SummaryCard";

beforeAll(() => {
  // Charts inside relatedCard use Recharts ResponsiveContainer; jsdom needs shims.
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

const baseSummary = {
  title: "Headline",
  summary: "Body text",
  findings: [],
  suggestedActions: [],
};

const statRelated = {
  label: "Active users",
  value: 1234,
  unit: "count" as const,
};

const timeSeriesRelated = {
  title: "DAU over time",
  series: [
    {
      name: "users",
      points: [
        { t: "2024-01-01T00:00:00Z", v: 10 },
        { t: "2024-01-02T00:00:00Z", v: 11 },
      ],
    },
  ],
};

const barChartRelated = {
  title: "Top products",
  bars: [{ label: "A", value: 50 }],
};

describe("SummaryCard — relatedCard discrimination", () => {
  it("renders a StatCard for a related card with `label` and `value`", () => {
    render(<SummaryCard {...baseSummary} relatedCard={statRelated} />);
    // StatCard renders the label in a stat-card-root testid or visible text.
    expect(screen.getByText("Active users")).toBeInTheDocument();
  });

  it("renders a TimeSeriesCard for a related card with a `series` array", () => {
    render(<SummaryCard {...baseSummary} relatedCard={timeSeriesRelated} />);
    expect(screen.getByText("DAU over time")).toBeInTheDocument();
  });

  it("renders a BarChartCard for a related card with a `bars` array", () => {
    render(<SummaryCard {...baseSummary} relatedCard={barChartRelated} />);
    expect(screen.getByText("Top products")).toBeInTheDocument();
  });

  it("does NOT misclassify a TimeSeriesCard as a StatCard (defensive: series+title shape)", () => {
    // A TimeSeriesCard payload also has a `title` but ALSO a `series`. The
    // old code's "title" in / "label" in discrimination was ambiguous when
    // a future card added `title`. The new discrimination should use the
    // unique arrays (series, bars) and only fall back to `label` for stat.
    render(<SummaryCard {...baseSummary} relatedCard={timeSeriesRelated} />);
    // The TimeSeriesCard title should appear; the StatCard label should not.
    expect(screen.getByText("DAU over time")).toBeInTheDocument();
    expect(screen.queryByText("Active users")).toBeNull();
  });
});
