"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CardRenderer } from "@/cards";
import type { ChatMessage } from "@/lib/chat";
import { cn } from "@/lib/utils";

interface AgentMessageProps {
  message: ChatMessage;
  timestamp?: string;
}

export function AgentMessage({ message, timestamp }: AgentMessageProps) {
  const hasCard = !!message.card;
  const isRefusal = message.card?.componentName === "ErrorCard" &&
    (message.card.props as { isReadOnlyViolation?: boolean }).isReadOnlyViolation === true;

  return (
    <div className="flex gap-0">
      {/* Left rail: timestamp + Eye marker + vertical line */}
      <div className="flex w-[52px] flex-shrink-0 flex-col items-center gap-1 pt-1">
        <div
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border",
            isRefusal
              ? "border-argus-danger/50 bg-argus-danger/10"
              : "border-argus-accent/40 bg-argus-accent/10",
          )}
          aria-hidden
        >
          {/* Argus eye — simple dot */}
          <div
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              isRefusal ? "bg-argus-danger" : "bg-argus-accent",
            )}
          />
        </div>
        <div className="flex-1 border-l border-argus-border" />
      </div>

      {/* Content column */}
      <div className="min-w-0 flex-1 pb-4">
        {/* Meta row */}
        <div className="mb-2 flex items-center gap-2">
          <span className="font-mono text-[10px] font-medium tracking-wide text-argus-text-subtle uppercase">
            Argus
          </span>
          {timestamp && (
            <span className="font-mono text-[10px] tabular-nums text-argus-text-subtle">
              {timestamp}
            </span>
          )}
          {isRefusal && (
            <span className="rounded-[4px] border border-argus-danger/30 bg-argus-danger/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-argus-danger">
              Write refused
            </span>
          )}
        </div>

        {/* Markdown content */}
        {message.content && (
          <div
            className={cn(
              "prose prose-sm max-w-none",
              "prose-p:text-argus-text prose-p:leading-relaxed",
              "prose-headings:font-heading prose-headings:text-argus-text prose-headings:font-semibold",
              "prose-strong:text-argus-text prose-strong:font-semibold",
              "prose-a:text-argus-accent prose-a:no-underline hover:prose-a:underline",
              "prose-ul:text-argus-text prose-ol:text-argus-text prose-li:text-argus-text",
              "prose-code:rounded-[4px] prose-code:border prose-code:border-argus-border prose-code:bg-argus-bg-sunken prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-[12px] prose-code:text-argus-accent",
              "prose-pre:rounded-[8px] prose-pre:border prose-pre:border-argus-border prose-pre:bg-argus-bg-sunken prose-pre:p-4",
              "prose-pre:prose-code:border-0 prose-pre:prose-code:bg-transparent prose-pre:prose-code:p-0",
              "prose-table:text-sm prose-th:text-argus-text-muted prose-th:font-mono prose-th:text-[11px] prose-th:uppercase prose-th:tracking-wide prose-td:text-argus-text",
              "prose-hr:border-argus-border",
              "prose-blockquote:border-l-argus-accent/50 prose-blockquote:text-argus-text-muted",
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Card — full width, given room to breathe */}
        {hasCard && (
          <div
            className={cn(
              "mt-4 w-full",
              isRefusal && "mt-5",
            )}
          >
            <CardRenderer descriptor={message.card!} />
          </div>
        )}
      </div>
    </div>
  );
}
