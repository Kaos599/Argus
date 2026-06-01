/**
 * Card registry for Tambo.
 * Each entry pairs a Zod schema (the LLM fills in) with the React component
 * that renders the result. Per research/14-zod-schemas.md this is the contract
 * between the backend card_renderer and the frontend.
 */
import type { TamboComponent } from "@tambo-ai/react";

import {
  BarChartCard,
  ErrorCard,
  HeatmapCard,
  StatCard,
  SummaryCard,
  TableCard,
  TimeSeriesCard,
} from "./index";

import {
  BarChartCardProps,
  ErrorCardProps,
  HeatmapCardProps,
  StatCardProps,
  SummaryCardProps,
  TableCardProps,
  TimeSeriesCardProps,
} from "@/types/api";

export const cardComponents: TamboComponent[] = [
  {
    name: "StatCard",
    description:
      "A single key metric (e.g. total users, conversion rate) with a value, optional unit, and a trend indicator.",
    component: StatCard,
    propsSchema: StatCardProps,
  },
  {
    name: "TimeSeriesCard",
    description:
      "A line chart of one or more metrics over time. Use for daily/weekly trends.",
    component: TimeSeriesCard,
    propsSchema: TimeSeriesCardProps,
  },
  {
    name: "BarChartCard",
    description:
      "A bar chart of categories and values (1-20 bars). Use for top-N lists and breakdowns.",
    component: BarChartCard,
    propsSchema: BarChartCardProps,
  },
  {
    name: "HeatmapCard",
    description:
      "A 2D heatmap (rows × cols, max 20×20). Use for cohort retention, time-vs-time, segment-vs-segment.",
    component: HeatmapCard,
    propsSchema: HeatmapCardProps,
  },
  {
    name: "TableCard",
    description:
      "A sortable, paginated, searchable table with CSV export. Use for top-N lists and raw data.",
    component: TableCard,
    propsSchema: TableCardProps,
  },
  {
    name: "SummaryCard",
    description:
      "A natural-language summary with structured findings, severity icons, and suggested follow-up questions.",
    component: SummaryCard,
    propsSchema: SummaryCardProps,
  },
  {
    name: "ErrorCard",
    description:
      "An error or refusal explanation. Use for failures and write-protection refusals (the agent CANNOT write — this is the user-facing explanation).",
    component: ErrorCard,
    propsSchema: ErrorCardProps,
  },
];
