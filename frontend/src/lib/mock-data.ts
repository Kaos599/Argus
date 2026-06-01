/**
 * Mock data for local development.
 * The API client falls back to these functions when NEXT_PUBLIC_USE_MOCK_DATA is true
 * (or unset, which is the default in dev).
 *
 * Per the spec, the mock data should be realistic — a MongoDB demo dataset
 * with 3 collections (users, events, orders) shaped to be funnel-able,
 * cohort-able, and rfm-able.
 */

import type {
  AddCardRequestType,
  AddCardResponseType,
  ConnectRequestType,
  ConnectResponseType,
  DashboardResponseType,
  HealthResponseType,
  LayoutRequestType,
  LayoutResponseType,
  PlanRequestType,
  PlanResponseType,
  ProbeResponseType,
  RefreshRequestType,
  RefreshResponseType,
  RenderEventType,
  RenderRequestType,
  SampleResponseType,
} from "@/types/api";

const DEMO_TOKEN = "demo-session-token-001";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/*  /connect                                                          */
/* ------------------------------------------------------------------ */

export async function mockConnect(
  body: ConnectRequestType,
): Promise<ConnectResponseType> {
  await wait(800);
  if (!body.connection_string.startsWith("mongodb")) {
    return {
      session_token: "",
      status: "error",
      error: {
        title: "Invalid connection string",
        message:
          "The connection string must start with `mongodb://` or `mongodb+srv://`.",
        isRetryable: false,
        isReadOnlyViolation: false,
        isFullPage: false,
      },
    };
  }
  return { session_token: DEMO_TOKEN, status: "probing" };
}

/* ------------------------------------------------------------------ */
/*  /probe                                                            */
/* ------------------------------------------------------------------ */

export async function mockProbe(_token: string): Promise<ProbeResponseType> {
  await wait(600);
  return {
    collections: 3,
    database_name: "argus_demo",
    mongo_version: "7.0.4",
    cluster_tier: "M0 (Free)",
    sample_status: "ready",
  };
}

/* ------------------------------------------------------------------ */
/*  /sample                                                           */
/* ------------------------------------------------------------------ */

export async function mockSample(_token: string): Promise<SampleResponseType> {
  await wait(700);
  return {
    collections: [
      {
        name: "users",
        doc_count: 1000,
        sample_fields: ["_id", "email", "country", "createdAt", "lastActiveAt", "lifetimeValue"],
      },
      {
        name: "events",
        doc_count: 50000,
        sample_fields: ["_id", "userId", "type", "ts", "properties"],
      },
      {
        name: "orders",
        doc_count: 5000,
        sample_fields: ["_id", "userId", "total", "items", "createdAt", "status"],
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  /plan                                                             */
/* ------------------------------------------------------------------ */

export async function mockPlan(body: PlanRequestType): Promise<PlanResponseType> {
  await wait(900);
  return {
    plan_id: "plan-demo-001",
    plan: body.modules.map((m) => ({
      module: m,
      collection: "events",
      mql_pipeline: [{ $match: { type: m } }, { $group: { _id: null, n: { $sum: 1 } } }],
      estimated_runtime_s: 0.5,
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  /render (SSE stream)                                              */
/* ------------------------------------------------------------------ */

const DEMO_CARDS = [
  {
    componentName: "StatCard" as const,
    props: {
      label: "Total users",
      value: 1000,
      unit: "count",
      delta: 47,
      deltaWindow: "week",
      trend: "up",
      comparisonText: "vs. last week",
    },
  },
  {
    componentName: "TimeSeriesCard" as const,
    props: {
      title: "Daily signups",
      series: [
        {
          name: "Signups",
          points: Array.from({ length: 30 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (29 - i));
            return {
              t: d.toISOString(),
              v: 20 + Math.round(Math.sin(i / 3) * 8 + Math.random() * 6),
            };
          }),
          color: "primary",
        },
      ],
      granularity: "day",
      showAnomalies: false,
    },
  },
  {
    componentName: "BarChartCard" as const,
    props: {
      title: "Top countries by users",
      orientation: "horizontal" as const,
      bars: [
        { label: "US", value: 412, color: "primary" },
        { label: "IN", value: 198, color: "primary" },
        { label: "GB", value: 87, color: "primary" },
        { label: "DE", value: 73, color: "primary" },
        { label: "BR", value: 64, color: "primary" },
        { label: "FR", value: 52, color: "primary" },
        { label: "JP", value: 41, color: "primary" },
        { label: "CA", value: 38, color: "primary" },
        { label: "AU", value: 22, color: "primary" },
        { label: "Other", value: 13, color: "primary" },
      ],
      sortBy: "value-desc" as const,
      showValues: true,
    },
  },
  {
    componentName: "SummaryCard" as const,
    props: {
      title: "Weekly insights",
      summary:
        "Signups are trending up (+12% week-over-week). Activation rate held steady at 68%. One anomaly detected: a 47% drop in Tuesday's signups likely correlated with a deploy at 14:32 UTC.",
      findings: [
        { text: "Signups up 12% week-over-week", severity: "info" as const, metric: "signups", delta: 12 },
        { text: "Tuesday saw a 47% signup drop", severity: "warning" as const, metric: "signups", delta: -47 },
        { text: "Activation rate steady at 68%", severity: "info" as const, metric: "activation_rate" },
      ],
      suggestedActions: [
        "Show me the Tuesday deploy timeline",
        "Compare this week to last week",
      ],
    },
  },
  {
    componentName: "TableCard" as const,
    props: {
      title: "Top spenders",
      columns: [
        { key: "email", label: "Email", format: "text" as const, sortable: true, align: "left" as const },
        { key: "country", label: "Country", format: "text" as const, sortable: true, align: "left" as const },
        { key: "ltv", label: "Lifetime value", format: "usd" as const, sortable: true, align: "right" as const },
        { key: "orders", label: "Orders", format: "number" as const, sortable: true, align: "right" as const },
      ],
      rows: Array.from({ length: 50 }, (_, i) => ({
        email: `user${i + 1}@example.com`,
        country: ["US", "IN", "GB", "DE", "BR", "FR", "JP"][i % 7],
        ltv: Math.round(2000 - i * 32 + Math.random() * 50),
        orders: Math.max(1, 20 - Math.floor(i / 3)),
      })),
      pageSize: 10,
      enableSearch: true,
      enableExport: true,
    },
  },
];

export async function* mockRenderEvents(
  _body: RenderRequestType,
): AsyncGenerator<RenderEventType> {
  const total = DEMO_CARDS.length;
  yield { event: "progress", data: { completed: 0, total } };
  for (let i = 0; i < DEMO_CARDS.length; i++) {
    await wait(400);
    yield { event: "card", data: DEMO_CARDS[i] };
    yield { event: "progress", data: { completed: i + 1, total } };
  }
  yield { event: "done", data: { plan_id: "plan-demo-001" } };
}

/* ------------------------------------------------------------------ */
/*  /dashboard                                                        */
/* ------------------------------------------------------------------ */

export async function mockDashboard(_token: string): Promise<DashboardResponseType> {
  await wait(300);
  return {
    layout: {
      lg: DEMO_CARDS.map((c, i) => ({
        i: `card-${i}`,
        x: (i * 4) % 12,
        y: Math.floor(i / 3) * 4,
        w: 4,
        h: 4,
      })),
      md: DEMO_CARDS.map((c, i) => ({
        i: `card-${i}`,
        x: (i * 6) % 12,
        y: Math.floor(i / 2) * 4,
        w: 6,
        h: 4,
      })),
      sm: DEMO_CARDS.map((c, i) => ({
        i: `card-${i}`,
        x: 0,
        y: i * 4,
        w: 6,
        h: 4,
      })),
      xs: DEMO_CARDS.map((c, i) => ({
        i: `card-${i}`,
        x: 0,
        y: i * 4,
        w: 4,
        h: 4,
      })),
    },
    cards: DEMO_CARDS,
  };
}

export async function mockLayout(_body: LayoutRequestType): Promise<LayoutResponseType> {
  await wait(150);
  return { ok: true };
}

export async function mockAddCard(body: AddCardRequestType): Promise<AddCardResponseType> {
  await wait(400);
  const cardId = `card-${Date.now()}`;
  const card = {
    componentName: "StatCard" as const,
    props: {
      label: `${body.module} result`,
      value: Math.round(Math.random() * 1000),
      unit: "count" as const,
    },
  };
  return { card_id: cardId, card };
}

export async function mockRefresh(_body: RefreshRequestType): Promise<RefreshResponseType> {
  await wait(800);
  return { refreshed_count: 5, error_count: 0 };
}

export async function mockHealth(): Promise<HealthResponseType> {
  await wait(80);
  return {
    status: "ok",
    uptime_s: 1234,
    version: "0.1.0",
    mcp_subprocesses: { active: 1, max: 10 },
  };
}
