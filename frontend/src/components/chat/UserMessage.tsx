"use client";

import { cn } from "@/lib/utils";

interface UserMessageProps {
  content: string;
  timestamp?: string;
}

export function UserMessage({ content, timestamp }: UserMessageProps) {
  return (
    <div className="flex justify-end">
      <div className="flex max-w-[65%] flex-col items-end gap-1">
        {timestamp && (
          <span className="font-mono text-[10px] tabular-nums text-argus-text-subtle">
            {timestamp}
          </span>
        )}
        <div
          className={cn(
            "rounded-[10px] rounded-br-[4px] border border-argus-border-strong/60",
            "bg-argus-bg-elevated px-4 py-2.5",
            "text-sm leading-relaxed text-argus-text",
          )}
        >
          <p className="whitespace-pre-wrap break-words">{content}</p>
        </div>
      </div>
    </div>
  );
}
