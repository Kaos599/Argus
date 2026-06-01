"use client";

import {
  BarChart3,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Table2,
  Sparkles,
  Grid3x3,
  LineChart as LineChartIcon,
} from "lucide-react";
import type { CardDescriptorType, CardNameType } from "@/types/api";
import { StatCard } from "./StatCard";
import { TimeSeriesCard } from "./TimeSeriesCard";
import { BarChartCard } from "./BarChartCard";
import { HeatmapCard } from "./HeatmapCard";
import { TableCard } from "./TableCard";
import { SummaryCard } from "./SummaryCard";
import { ErrorCard } from "./ErrorCard";

export const CARD_ICONS: Record<CardNameType, typeof BarChart3> = {
  StatCard: TrendingUp,
  TimeSeriesCard: LineChartIcon,
  BarChartCard: BarChart3,
  HeatmapCard: Grid3x3,
  TableCard: Table2,
  SummaryCard: Sparkles,
  ErrorCard: AlertTriangle,
};

export const CARD_LABELS: Record<CardNameType, string> = {
  StatCard: "Stat",
  TimeSeriesCard: "Trend",
  BarChartCard: "Bar",
  HeatmapCard: "Heatmap",
  TableCard: "Table",
  SummaryCard: "Summary",
  ErrorCard: "Error",
};

export function CardRenderer({ descriptor }: { descriptor: CardDescriptorType }) {
  const { componentName, props } = descriptor;
  switch (componentName) {
    case "StatCard":
      return <StatCard {...(props as React.ComponentProps<typeof StatCard>)} />;
    case "TimeSeriesCard":
      return (
        <TimeSeriesCard {...(props as React.ComponentProps<typeof TimeSeriesCard>)} />
      );
    case "BarChartCard":
      return (
        <BarChartCard {...(props as React.ComponentProps<typeof BarChartCard>)} />
      );
    case "HeatmapCard":
      return <HeatmapCard {...(props as React.ComponentProps<typeof HeatmapCard>)} />;
    case "TableCard":
      return <TableCard {...(props as React.ComponentProps<typeof TableCard>)} />;
    case "SummaryCard":
      return <SummaryCard {...(props as React.ComponentProps<typeof SummaryCard>)} />;
    case "ErrorCard":
      return <ErrorCard {...(props as React.ComponentProps<typeof ErrorCard>)} />;
    default: {
      const exhaustive: never = componentName;
      void exhaustive;
      return null;
    }
  }
}

export { StatCard, TimeSeriesCard, BarChartCard, HeatmapCard, TableCard, SummaryCard, ErrorCard };
export { TrendingUp, TrendingDown, Minus };
