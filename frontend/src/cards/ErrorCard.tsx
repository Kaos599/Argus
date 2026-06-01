"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
  RotateCw,
  ShieldOff,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { ErrorCardPropsType } from "@/types/api";

const READ_ONLY_LAYERS = [
  {
    n: 1,
    title: "MCP server runs in read-only mode",
    detail:
      "The mongodb-mcp-server subprocess is started with MDB_MCP_READ_ONLY=true. Every write tool (insert, update, delete, drop, createIndex) is stripped from the tool list at startup, so the agent literally cannot call them.",
  },
  {
    n: 2,
    title: "A read-only database user",
    detail:
      "During onboarding we recommend creating a MongoDB user with the readAnyDatabase built-in role (or a custom role with only find and aggregate). Even if the MCP layer were compromised, the database itself would refuse writes.",
  },
  {
    n: 3,
    title: "Planner-layer guard",
    detail:
      "argus-result-set-guard scans every aggregation pipeline before it reaches MongoDB. It blocks $out and $merge at compile time, and enforces a .limit() on every find and aggregate so a runaway query can't dump your data.",
  },
];

export function ErrorCard({
  title = "Something went wrong",
  message,
  errorCode,
  technicalDetails,
  isRetryable = true,
  isReadOnlyViolation = false,
  isFullPage = false,
  guidance,
}: ErrorCardPropsType) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const isReadOnly = isReadOnlyViolation;
  const isFullPageActive = isFullPage && isReadOnlyViolation;
  const severity: "error" | "warning" = isReadOnly ? "error" : "error";

  return (
    <div
      data-testid="error-card-root"
      data-full-page={isFullPageActive ? "true" : undefined}
      className={cn(
        isFullPageActive &&
          "flex min-h-[calc(100vh-8rem)] w-full items-center justify-center",
      )}
    >
    <Card
      surface="transparent"
      className={cn(
        isFullPageActive && "max-w-2xl",
        "border",
        severity === "error"
          ? "border-argus-danger bg-argus-danger-bg/30 dark:bg-argus-danger-bg/20"
          : "border-argus-warning bg-argus-warning-bg/30 dark:bg-argus-warning-bg/20",
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
            severity === "error"
              ? "bg-argus-danger text-white"
              : "bg-argus-warning text-white",
          )}
          aria-hidden
        >
          {isReadOnly ? (
            <Lock className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-argus-text">{title}</h3>
          <p className="mt-1 text-sm text-argus-text">{message}</p>

          {guidance && (
            <p className="mt-2 text-sm text-argus-text-muted">{guidance}</p>
          )}

          {isReadOnly && (
            <div className="mt-3 rounded-sm border border-argus-danger/40 bg-argus-bg-elevated p-3">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-argus-danger">
                <ShieldOff className="h-3.5 w-3.5" aria-hidden />
                Argus is read-only by design.
              </p>
              <p className="mt-1 text-xs text-argus-text-muted">
                This is not a bug — Argus can never write to your data. Here is
                why:
              </p>
              <ol className="mt-2 space-y-2 text-xs text-argus-text">
                {READ_ONLY_LAYERS.map((layer) => (
                  <li key={layer.n} className="flex gap-2">
                    <span className="mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-argus-primary text-[10px] font-bold text-argus-primary-fg">
                      {layer.n}
                    </span>
                    <div>
                      <p className="font-medium">{layer.title}</p>
                      <p className="text-argus-text-muted">{layer.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {technicalDetails && (
            <details
              className="mt-3"
              open={expanded}
              onToggle={(e) => setExpanded((e.target as HTMLDetailsElement).open)}
            >
              <summary className="inline-flex cursor-pointer items-center gap-1 text-xs text-argus-text-muted hover:text-argus-text">
                {expanded ? (
                  <ChevronUp className="h-3 w-3" aria-hidden />
                ) : (
                  <ChevronDown className="h-3 w-3" aria-hidden />
                )}
                Technical details
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded-sm bg-argus-bg-sunken p-2 font-mono text-xs text-argus-text">
                {technicalDetails}
              </pre>
            </details>
          )}

          {errorCode && (
            <p className="mt-2 font-mono text-xs text-argus-text-subtle">
              Code: {errorCode}
            </p>
          )}
        </div>

        <div className="flex flex-shrink-0 flex-col items-end gap-2">
          {isRetryable && !isReadOnly && (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.location.reload();
              }}
              className="inline-flex h-8 items-center gap-1 rounded-sm border border-argus-border bg-argus-bg px-2 text-xs text-argus-text hover:bg-argus-bg-elevated"
            >
              <RotateCw className="h-3.5 w-3.5" aria-hidden />
              Retry
            </button>
          )}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="inline-flex h-8 items-center gap-1 rounded-sm border border-argus-border bg-argus-bg px-2 text-xs text-argus-text-muted hover:bg-argus-bg-elevated"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Dismiss
          </button>
        </div>
      </div>

      {!isReadOnly && !isRetryable && (
        <p className="mx-4 mb-3 inline-flex items-center gap-1 text-xs text-argus-text-muted">
          <CheckCircle2 className="h-3.5 w-3.5 text-argus-accent" aria-hidden />
          The underlying data is safe — this is a request-level error, not a
          database problem.
        </p>
      )}
    </Card>
    </div>
  );
}
