"use client";

import { useCallback, useState } from "react";
import { useTambo, useTamboThreadInput } from "@tambo-ai/react";
import type { ReactTamboThreadMessage } from "@tambo-ai/react";
import type { CardDescriptorType } from "@/types/api";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  card?: CardDescriptorType;
};

const USE_MOCK =
  (typeof process !== "undefined" &&
    (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" ||
      process.env.NEXT_PUBLIC_USE_MOCK_DATA === "1")) ||
  !process.env.NEXT_PUBLIC_TAMBO_API_KEY;

const SUGGESTIONS = [
  "Show me the count of users",
  "Top 10 countries by users",
  "Daily signups last 30 days",
  "What anomalies do you see?",
  "Drop the users collection",
];

/**
 * A unified chat hook that works in both real (Tambo) and mock mode.
 * In mock mode, it pattern-matches the user's message against a set of
 * canned responses to simulate the Tambo agent picking the right card.
 */
export function useChat(): {
  messages: ChatMessage[];
  value: string;
  setValue: (v: string) => void;
  submit: () => Promise<void>;
  isStreaming: boolean;
  suggestions: string[];
} {
  // USE_MOCK is a module constant (env vars are read once at module load and
  // never mutated in production). Branching on it here is safe at runtime,
  // but eslint cannot prove that — the two paths below are the only two
  // hook orders this function will ever produce.
  /* eslint-disable react-hooks/rules-of-hooks */
  if (USE_MOCK) return useMockChat();
  const { messages, isStreaming } = useTambo();
  const { value, setValue, submit } = useTamboThreadInput();
  /* eslint-enable react-hooks/rules-of-hooks */
  return {
    messages: toChatMessages(messages),
    value,
    setValue: (v: string) => setValue(v),
    submit: async () => {
      await submit();
    },
    isStreaming,
    suggestions: SUGGESTIONS,
  };
}

function toChatMessages(messages: ReactTamboThreadMessage[]): ChatMessage[] {
  return messages.map((m) => {
    const text = m.content
      ?.filter((c) => c.type === "text")
      .map((c) => ("text" in c ? c.text : ""))
      .join("\n");
    const component = m.content?.find(
      (c) => c.type === "component",
    ) as { renderedComponent?: React.ReactNode; props?: Record<string, unknown> } | undefined;
    return {
      id: m.id,
      role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
      content: text ?? "",
      card: component
        ? {
            componentName: "StatCard",
            props: component.props ?? {},
          }
        : undefined,
    };
  });
}

/* ============================================================
   Mock chat — pattern-matches canned prompts to cards.
   ============================================================ */

function useMockChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm Argus, your agentic analyst for MongoDB. Ask me anything about your data. Try one of the suggestions below to get started.",
    },
  ]);
  const [value, setValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const handleSubmit = useCallback(async () => {
    const text = value.trim();
    if (!text) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((m) => [...m, userMsg]);
    setValue("");
    setIsStreaming(true);

    await new Promise((r) => setTimeout(r, 700));

    const { content, card } = mockAgentResponse(text);
    const assistantMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content,
      card,
    };
    setMessages((m) => [...m, assistantMsg]);
    setIsStreaming(false);
  }, [value]);

  return {
    messages,
    value,
    setValue: (v: string) => setValue(v),
    submit: handleSubmit,
    isStreaming,
    suggestions: SUGGESTIONS,
  };
}

function mockAgentResponse(prompt: string): { content: string; card?: CardDescriptorType } {
  const p = prompt.toLowerCase();
  if (
    p.includes("drop") ||
    p.includes("delete") ||
    p.includes("remove the") ||
    p.includes("truncate")
  ) {
    return {
      content:
        "I can't drop that — Argus is read-only by design. Three layers of write protection make this impossible: the MCP server is started with MDB_MCP_READ_ONLY=true, your database user has only read permissions, and the result_set_guard blocks $out/$merge before they ever reach MongoDB.",
      card: {
        componentName: "ErrorCard",
        props: {
          title: "Write refused",
          message:
            "Dropping a collection requires a write — Argus can never perform writes against your cluster.",
          isReadOnlyViolation: true,
          isRetryable: false,
          guidance:
            "If you need to drop a collection, do it from the MongoDB shell or Atlas UI as a separate, explicit operation.",
          errorCode: "READ_ONLY_VIOLATION",
        },
      },
    };
  }
  if (p.includes("count") && p.includes("user")) {
    return {
      content: "You have 1,000 users, up 47 this week.",
      card: {
        componentName: "StatCard",
        props: {
          label: "Total users",
          value: 1000,
          unit: "count",
          delta: 47,
          deltaWindow: "week",
          trend: "up",
          comparisonText: "vs last week",
        },
      },
    };
  }
  if (p.includes("count") || p.includes("how many")) {
    return {
      content: "Here's the count you asked for.",
      card: {
        componentName: "StatCard",
        props: {
          label: "Document count",
          value: 12345,
          unit: "count",
        },
      },
    };
  }
  if (p.includes("top") || p.includes("countries") || p.includes("by country")) {
    return {
      content: "Top 10 countries by user count:",
      card: {
        componentName: "BarChartCard",
        props: {
          title: "Top countries by users",
          orientation: "horizontal",
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
          sortBy: "value-desc",
          showValues: true,
        },
      },
    };
  }
  if (p.includes("daily") || p.includes("signups") || p.includes("trend")) {
    return {
      content: "Daily signups for the last 30 days:",
      card: {
        componentName: "TimeSeriesCard",
        props: {
          title: "Daily signups",
          series: [
            {
              name: "Signups",
              color: "primary",
              points: Array.from({ length: 30 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (29 - i));
                return {
                  t: d.toISOString(),
                  v: 20 + Math.round(Math.sin(i / 3) * 8 + Math.random() * 6),
                };
              }),
            },
          ],
          granularity: "day",
          showAnomalies: true,
        },
      },
    };
  }
  if (p.includes("anomal") || p.includes("what")) {
    return {
      content: "Looking at the last 7 days, here are the notable findings:",
      card: {
        componentName: "SummaryCard",
        props: {
          title: "Weekly insights",
          summary:
            "Signups are trending up (+12% week-over-week). One anomaly detected: a 47% drop in Tuesday's signups.",
          findings: [
            {
              text: "Signups up 12% week-over-week",
              severity: "info",
              metric: "signups",
              delta: 12,
            },
            {
              text: "Tuesday saw a 47% signup drop",
              severity: "warning",
              metric: "signups",
              delta: -47,
            },
            {
              text: "Activation rate steady at 68%",
              severity: "info",
              metric: "activation_rate",
            },
          ],
          suggestedActions: [
            "Show me the Tuesday deploy timeline",
            "Compare this week to last week",
          ],
        },
      },
    };
  }
  if (p.includes("spend") || p.includes("top users") || p.includes("table")) {
    return {
      content: "Top spenders:",
      card: {
        componentName: "TableCard",
        props: {
          title: "Top spenders",
          columns: [
            {
              key: "email",
              label: "Email",
              format: "text",
              sortable: true,
              align: "left",
            },
            {
              key: "country",
              label: "Country",
              format: "text",
              sortable: true,
              align: "left",
            },
            {
              key: "ltv",
              label: "Lifetime value",
              format: "usd",
              sortable: true,
              align: "right",
            },
          ],
          rows: Array.from({ length: 25 }, (_, i) => ({
            email: `user${i + 1}@example.com`,
            country: ["US", "IN", "GB", "DE", "BR", "FR", "JP"][i % 7],
            ltv: 2000 - i * 32,
          })),
          pageSize: 10,
          enableSearch: true,
          enableExport: true,
        },
      },
    };
  }
  return {
    content:
      "I can answer questions about your MongoDB data. Try one of the suggestions, or ask me something like 'show me the count of users'.",
  };
}
