"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, Info, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CardRenderer } from "./index";
import { cn } from "@/lib/utils";
import type { SummaryCardPropsType } from "@/types/api";

const SEVERITY_META: Record<
  SummaryCardPropsType["findings"][number]["severity"],
  { Icon: typeof Info; color: string; bg: string }
> = {
  info: {
    Icon: Info,
    color: "text-argus-primary",
    bg: "bg-argus-info-bg",
  },
  warning: {
    Icon: AlertTriangle,
    color: "text-argus-warning",
    bg: "bg-argus-warning-bg",
  },
  critical: {
    Icon: AlertCircle,
    color: "text-argus-danger",
    bg: "bg-argus-danger-bg",
  },
};

export function SummaryCard({
  title,
  summary,
  findings,
  suggestedActions,
  relatedCard,
}: SummaryCardPropsType) {
  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-argus-accent" aria-hidden />
          <span className="font-heading">{title}</span>
        </span>
      }
    >
      <p className="text-sm leading-relaxed text-argus-text">{summary}</p>

      {findings.length > 0 && (
        <ul className="mt-4 space-y-2" role="list">
          {findings.map((f, i) => {
            const meta = SEVERITY_META[f.severity] ?? SEVERITY_META.info;
            const { Icon } = meta;
            return (
              <li
                key={i}
                className={cn(
                  "flex items-start gap-2.5 rounded-[8px] border border-argus-border px-3.5 py-2.5",
                  meta.bg,
                )}
              >
                <Icon className={cn("mt-0.5 h-4 w-4 flex-shrink-0", meta.color)} aria-hidden />
                <div className="flex-1 text-sm text-argus-text">
                  <span>{f.text}</span>
                  {f.metric && f.delta !== undefined && (
                    <span
                      className={cn(
                        "ml-2 font-mono text-xs tabular-nums",
                        meta.color,
                      )}
                    >
                      {f.delta > 0 ? "+" : ""}
                      {f.delta}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {suggestedActions && suggestedActions.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-argus-text-subtle">
            You might also ask
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestedActions.map((s, i) => (
              <button
                key={i}
                type="button"
                className="rounded-[8px] border border-argus-border bg-argus-bg px-3 py-1.5 text-xs text-argus-text transition-colors hover:border-argus-accent hover:text-argus-accent"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {relatedCard && (
        <div className="mt-4 border-t border-argus-border pt-4">
          <CardRenderer
            descriptor={
              Array.isArray((relatedCard as { series?: unknown }).series)
                ? { componentName: "TimeSeriesCard", props: relatedCard as never }
                : Array.isArray((relatedCard as { bars?: unknown }).bars)
                  ? { componentName: "BarChartCard", props: relatedCard as never }
                  : "label" in relatedCard
                    ? { componentName: "StatCard", props: relatedCard as never }
                    : { componentName: "ErrorCard", props: relatedCard as never }
            }
          />
        </div>
      )}

      <div className="mt-4 flex items-center gap-1.5 text-xs text-argus-text-subtle">
        <CheckCircle2 className="h-3.5 w-3.5 text-argus-accent" aria-hidden />
        <span>Read-only — no writes performed</span>
      </div>
    </Card>
  );
}
