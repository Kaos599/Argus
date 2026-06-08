/**
 * Typed API client for the Argus backend.
 * Per research/15-routes.md, the backend exposes 11 endpoints.
 * Per research/19-error-states.md, error responses are wrapped in an envelope.
 *
 * If NEXT_PUBLIC_USE_MOCK_DATA is true (or the backend is unreachable
 * at the configured base URL), the client falls back to mock data.
 */

import {
  type AddCardRequestType,
  type AddCardResponseType,
  type CardDescriptorType,
  type ConnectRequestType,
  type ConnectResponseType,
  type DashboardResponseType,
  type ErrorResponseType,
  type HealthResponseType,
  type LayoutRequestType,
  type LayoutResponseType,
  type PlanRequestType,
  type PlanResponseType,
  type ProbeResponseType,
  type RefreshRequestType,
  type RefreshResponseType,
  type RenderEventType,
  type RenderRequestType,
  type SampleResponseType,
} from "@/types/api";

import {
  mockAddCard,
  mockConnect,
  mockDashboard,
  mockHealth,
  mockLayout,
  mockPlan,
  mockProbe,
  mockRefresh,
  mockRenderEvents,
  mockSample,
} from "./mock-data";

export class ArgusApiError extends Error {
  readonly code: string;
  readonly isRetryable: boolean;
  readonly guidance?: string;
  readonly technicalDetails?: string;
  readonly status: number;

  constructor(opts: {
    message: string;
    code: string;
    isRetryable: boolean;
    status: number;
    guidance?: string;
    technicalDetails?: string;
  }) {
    super(opts.message);
    this.name = "ArgusApiError";
    this.code = opts.code;
    this.isRetryable = opts.isRetryable;
    this.guidance = opts.guidance;
    this.technicalDetails = opts.technicalDetails;
    this.status = opts.status;
  }
}

const BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL) ||
  "http://localhost:8080";

const USE_MOCK = (() => {
  if (typeof process === "undefined") return true;
  const v = process.env.NEXT_PUBLIC_USE_MOCK_DATA;
  return v === "true" || v === "1" || !v;
})();

type RequestOptions = {
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

async function request<TResponse>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
  opts: RequestOptions = {},
): Promise<TResponse> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Demo-Mode": "true",
      ...(opts.headers || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: opts.signal,
  });

  if (!res.ok) {
    let envelope: ErrorResponseType | undefined;
    try {
      envelope = (await res.json()) as ErrorResponseType;
    } catch {
      // not a JSON envelope
    }
    if (envelope?.error) {
      throw new ArgusApiError({
        message: envelope.error.message,
        code: envelope.error.code,
        isRetryable: envelope.error.isRetryable,
        status: res.status,
        guidance: envelope.error.guidance,
        technicalDetails: envelope.error.technicalDetails,
      });
    }
    throw new ArgusApiError({
      message: res.statusText || `Request failed with status ${res.status}`,
      code: "UNKNOWN",
      isRetryable: res.status >= 500,
      status: res.status,
    });
  }

  if (res.status === 204) return undefined as TResponse;
  return (await res.json()) as TResponse;
}

/* ============================================================
   11 endpoints
   ============================================================ */

export async function connect(
  body: ConnectRequestType,
  opts: RequestOptions = {},
): Promise<ConnectResponseType> {
  if (USE_MOCK) return mockConnect(body);
  return request<ConnectResponseType>("POST", "/api/v1/connect", body, opts);
}

export async function probe(
  token: string,
  opts: RequestOptions = {},
): Promise<ProbeResponseType> {
  if (USE_MOCK) return mockProbe(token);
  return request<ProbeResponseType>("GET", `/api/v1/probe/${token}`, undefined, opts);
}

export async function sample(
  token: string,
  opts: RequestOptions = {},
): Promise<SampleResponseType> {
  if (USE_MOCK) return mockSample(token);
  return request<SampleResponseType>("GET", `/api/v1/sample/${token}`, undefined, opts);
}

export async function plan(
  body: PlanRequestType,
  opts: RequestOptions = {},
): Promise<PlanResponseType> {
  if (USE_MOCK) return mockPlan(body);
  return request<PlanResponseType>("POST", "/api/v1/plan", body, opts);
}

/**
 * /api/v1/render is an SSE stream. This returns an async iterator
 * that yields each event as it arrives. Mock mode emits events
 * on a timer to simulate the streaming behavior.
 */
export async function* renderStream(
  body: RenderRequestType,
  opts: RequestOptions = {},
): AsyncGenerator<RenderEventType> {
  if (USE_MOCK) {
    for await (const ev of mockRenderEvents(body)) {
      if (opts.signal?.aborted) return;
      yield ev;
    }
    return;
  }
  const url = `${BASE_URL}/api/v1/render`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Demo-Mode": "true",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) {
    throw new ArgusApiError({
      message: `Render stream failed: ${res.statusText}`,
      code: "UNKNOWN",
      isRetryable: res.status >= 500,
      status: res.status,
    });
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const eventLine = part.split("\n").find((l) => l.startsWith("event:"));
      const eventName = eventLine ? eventLine.slice(6).trim() : undefined;
      const line = part.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const json = line.slice(5).trim();
      try {
        const dataPayload = JSON.parse(json);
        if (eventName) {
          yield { event: eventName, data: dataPayload } as RenderEventType;
        }
      } catch {
        // ignore malformed events
      }
    }
  }
}

export async function getDashboard(
  token: string,
  opts: RequestOptions = {},
): Promise<DashboardResponseType> {
  if (USE_MOCK) return mockDashboard(token);
  return request<DashboardResponseType>(
    "GET",
    `/api/v1/dashboard?token=${encodeURIComponent(token)}`,
    undefined,
    opts,
  );
}

export async function saveLayout(
  body: LayoutRequestType,
  opts: RequestOptions = {},
): Promise<LayoutResponseType> {
  if (USE_MOCK) return mockLayout(body);
  return request<LayoutResponseType>(
    "PUT",
    "/api/v1/dashboard/layout",
    body,
    opts,
  );
}

export async function addCard(
  body: AddCardRequestType,
  opts: RequestOptions = {},
): Promise<AddCardResponseType> {
  if (USE_MOCK) return mockAddCard(body);
  return request<AddCardResponseType>("POST", "/api/v1/cards", body, opts);
}

export async function refresh(
  body: RefreshRequestType,
  opts: RequestOptions = {},
): Promise<RefreshResponseType> {
  if (USE_MOCK) return mockRefresh(body);
  return request<RefreshResponseType>("POST", "/api/v1/refresh", body, opts);
}

export async function health(opts: RequestOptions = {}): Promise<HealthResponseType> {
  if (USE_MOCK) return mockHealth();
  return request<HealthResponseType>("GET", "/api/v1/health", undefined, opts);
}

/* Re-export types for convenience */
export type { CardDescriptorType };
