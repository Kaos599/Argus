/**
 * Shared API contract between Argus frontend (Next.js + Tambo) and backend (FastAPI + mcp).
 *
 * The frontend's API client imports these types. The backend emits card descriptors that
 * conform to the Zod schemas in research/14-zod-schemas.md.
 *
 * This file is the source of truth. If you change a type here, both sides must be updated.
 */

import { z } from 'zod';

// =============================================================================
// 7 Card Schemas (the contract between card_renderer.py and the React components)
// Per research/14-zod-schemas.md
// =============================================================================

export const StatCardProps = z.object({
  label: z.string().describe('Human-readable label, e.g. "Active users"'),
  value: z.number().describe('The numeric value'),
  unit: z.enum(['', 'count', 'percent', 'usd', 'eur', 'gbp', 'days', 'hours']).optional(),
  delta: z.number().optional().describe('Optional change from previous period (signed)'),
  deltaWindow: z.enum(['day', 'week', 'month']).optional(),
  trend: z.enum(['up', 'down', 'flat']).optional(),
  comparisonText: z.string().optional(),
});

export const TimeSeriesCardProps = z.object({
  title: z.string(),
  series: z.array(z.object({
    name: z.string(),
    points: z.array(z.object({
      t: z.string().describe('ISO 8601 timestamp'),
      v: z.number(),
    })),
    color: z.enum(['primary', 'secondary', 'success', 'warning', 'danger']).optional(),
  })).min(1),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).optional(),
  showAnomalies: z.boolean().optional(),
});

export const BarChartCardProps = z.object({
  title: z.string(),
  orientation: z.enum(['vertical', 'horizontal']).default('vertical'),
  bars: z.array(z.object({
    label: z.string(),
    value: z.number(),
    color: z.enum(['primary', 'secondary', 'success', 'warning', 'danger']).optional(),
  })).min(1).max(20),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
  sortBy: z.enum(['value-desc', 'value-asc', 'label-asc']).default('value-desc'),
  showValues: z.boolean().default(true),
});

export const HeatmapCardProps = z.object({
  title: z.string(),
  rowLabels: z.array(z.string()).min(2).max(20),
  colLabels: z.array(z.string()).min(2).max(20),
  values: z.array(z.array(z.number())),
  colorScale: z.enum(['sequential', 'diverging']).default('sequential'),
  colorDomain: z.tuple([z.number(), z.number()]).optional(),
  cellFormat: z.enum(['count', 'percent', 'usd']).default('count'),
  showRowLabels: z.boolean().default(true),
  showColLabels: z.boolean().default(true),
});

export const TableCardProps = z.object({
  title: z.string(),
  columns: z.array(z.object({
    key: z.string(),
    label: z.string(),
    format: z.enum(['text', 'number', 'percent', 'usd', 'date', 'datetime']).default('text'),
    sortable: z.boolean().default(true),
    align: z.enum(['left', 'center', 'right']).default('left'),
  })).min(1).max(10),
  rows: z.array(z.record(z.union([z.string(), z.number(), z.null()]))).min(1).max(1000),
  pageSize: z.number().min(10).max(100).default(25),
  enableSearch: z.boolean().default(true),
  enableExport: z.boolean().default(true),
});

export const SummaryCardProps = z.object({
  title: z.string(),
  summary: z.string(),
  findings: z.array(z.object({
    text: z.string(),
    severity: z.enum(['info', 'warning', 'critical']).default('info'),
    metric: z.string().optional(),
    delta: z.number().optional(),
  })).max(5),
  suggestedActions: z.array(z.string()).max(3).optional(),
  relatedCard: z.union([
    StatCardProps,
    TimeSeriesCardProps,
    BarChartCardProps,
  ]).optional(),
});

export const ErrorCardProps = z.object({
  title: z.string().default('Something went wrong'),
  message: z.string(),
  errorCode: z.string().optional(),
  technicalDetails: z.string().optional(),
  isRetryable: z.boolean().default(true),
  isReadOnlyViolation: z.boolean().default(false),
  isFullPage: z.boolean().default(false),
  guidance: z.string().optional(),
});

export const CardName = z.enum([
  'StatCard',
  'TimeSeriesCard',
  'BarChartCard',
  'HeatmapCard',
  'TableCard',
  'SummaryCard',
  'ErrorCard',
]);

export const CardDescriptor = z.object({
  componentName: CardName,
  props: z.record(z.unknown()),
});

export type StatCardPropsType = z.infer<typeof StatCardProps>;
export type TimeSeriesCardPropsType = z.infer<typeof TimeSeriesCardProps>;
export type BarChartCardPropsType = z.infer<typeof BarChartCardProps>;
export type HeatmapCardPropsType = z.infer<typeof HeatmapCardProps>;
export type TableCardPropsType = z.infer<typeof TableCardProps>;
export type SummaryCardPropsType = z.infer<typeof SummaryCardProps>;
export type ErrorCardPropsType = z.infer<typeof ErrorCardProps>;
export type CardNameType = z.infer<typeof CardName>;
export type CardDescriptorType = z.infer<typeof CardDescriptor>;

// =============================================================================
// API Request/Response types
// Per research/15-routes.md
// =============================================================================

// POST /api/v1/connect
export const ConnectRequest = z.object({
  connection_string: z.string().min(1),
  acknowledged_risks: z.array(z.string()).optional(),
});
export const ConnectResponse = z.object({
  session_token: z.string(),
  status: z.enum(['probing', 'ready', 'error']),
  error: ErrorCardProps.optional(),
});
export type ConnectRequestType = z.infer<typeof ConnectRequest>;
export type ConnectResponseType = z.infer<typeof ConnectResponse>;

// GET /api/v1/probe/{token}
export const ProbeResponse = z.object({
  collections: z.number(),
  database_name: z.string(),
  mongo_version: z.string().optional(),
  cluster_tier: z.string().optional(),
  sample_status: z.enum(['pending', 'sampling', 'ready', 'error']),
});
export type ProbeResponseType = z.infer<typeof ProbeResponse>;

// GET /api/v1/sample/{token}
export const SampleResponse = z.object({
  collections: z.array(z.object({
    name: z.string(),
    doc_count: z.number(),
    sample_fields: z.array(z.string()),
  })),
});
export type SampleResponseType = z.infer<typeof SampleResponse>;

// POST /api/v1/plan
export const PlanRequest = z.object({
  session_token: z.string(),
  collections: z.array(z.string()).min(1).max(20),
  modules: z.array(z.enum(['funnel', 'cohort', 'rfm', 'attribution', 'anomaly'])).min(1).max(5),
});
export const PlanResponse = z.object({
  plan_id: z.string(),
  plan: z.array(z.object({
    module: z.string(),
    collection: z.string(),
    mql_pipeline: z.array(z.record(z.unknown())),
    estimated_runtime_s: z.number().optional(),
  })),
});
export type PlanRequestType = z.infer<typeof PlanRequest>;
export type PlanResponseType = z.infer<typeof PlanResponse>;

// POST /api/v1/render (SSE stream)
export const RenderRequest = z.object({
  session_token: z.string(),
  plan_id: z.string(),
});
export const RenderEvent = z.union([
  z.object({ event: z.literal('card'), data: CardDescriptor }),
  z.object({ event: z.literal('progress'), data: z.object({ completed: z.number(), total: z.number() }) }),
  z.object({ event: z.literal('error'), data: ErrorCardProps }),
  z.object({ event: z.literal('done'), data: z.object({ plan_id: z.string() }) }),
]);
export type RenderRequestType = z.infer<typeof RenderRequest>;
export type RenderEventType = z.infer<typeof RenderEvent>;

// GET /api/v1/dashboard
export const DashboardResponse = z.object({
  layout: z.object({
    lg: z.array(z.object({ i: z.string(), x: z.number(), y: z.number(), w: z.number(), h: z.number() })),
    md: z.array(z.object({ i: z.string(), x: z.number(), y: z.number(), w: z.number(), h: z.number() })),
    sm: z.array(z.object({ i: z.string(), x: z.number(), y: z.number(), w: z.number(), h: z.number() })),
    xs: z.array(z.object({ i: z.string(), x: z.number(), y: z.number(), w: z.number(), h: z.number() })),
  }),
  cards: z.array(CardDescriptor),
});
export type DashboardResponseType = z.infer<typeof DashboardResponse>;

// PUT /api/v1/dashboard/layout
export const LayoutRequest = z.object({
  session_token: z.string(),
  layout: DashboardResponse.shape.layout,
});
export const LayoutResponse = z.object({ ok: z.boolean() });
export type LayoutRequestType = z.infer<typeof LayoutRequest>;
export type LayoutResponseType = z.infer<typeof LayoutResponse>;

// POST /api/v1/cards
export const AddCardRequest = z.object({
  session_token: z.string(),
  module: z.enum(['funnel', 'cohort', 'rfm', 'attribution', 'anomaly']),
  collection: z.string().optional(),
  params: z.record(z.unknown()).optional(),
});
export const AddCardResponse = z.object({
  card_id: z.string(),
  card: CardDescriptor,
});
export type AddCardRequestType = z.infer<typeof AddCardRequest>;
export type AddCardResponseType = z.infer<typeof AddCardResponse>;

// POST /api/v1/refresh
export const RefreshRequest = z.object({
  session_token: z.string(),
});
export const RefreshResponse = z.object({
  refreshed_count: z.number(),
  error_count: z.number(),
});
export type RefreshRequestType = z.infer<typeof RefreshRequest>;
export type RefreshResponseType = z.infer<typeof RefreshResponse>;

// GET /api/v1/health
export const HealthResponse = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  uptime_s: z.number(),
  version: z.string(),
  mcp_subprocesses: z.object({
    active: z.number(),
    max: z.number(),
  }),
});
export type HealthResponseType = z.infer<typeof HealthResponse>;

// =============================================================================
// Error envelope
// Per research/19-error-states.md
// =============================================================================

export const ErrorCode = z.enum([
  'CONNECTION_FAILED',
  'INVALID_INPUT',
  'RATE_LIMITED',
  'READ_ONLY_VIOLATION',
  'MQL_EXECUTION_FAILED',
  'LLM_HALLUCINATION',
  'SCHEMA_SAMPLE_FAILED',
  'MCP_SUBPROCESS_FAILED',
  'UNKNOWN',
]);
export type ErrorCodeType = z.infer<typeof ErrorCode>;

export const ErrorResponse = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    technicalDetails: z.string().optional(),
    isRetryable: z.boolean(),
    guidance: z.string().optional(),
  }),
});
export type ErrorResponseType = z.infer<typeof ErrorResponse>;
