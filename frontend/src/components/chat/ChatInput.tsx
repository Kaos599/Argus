"use client";

import { Lock, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isStreaming: boolean;
}

export function ChatInput({ value, onChange, onSubmit, isStreaming }: ChatInputProps) {
  return (
    <div className="border-t border-argus-border bg-argus-bg pt-3 pb-4">
      <form
        id="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="relative"
      >
        <label htmlFor="chat-input" className="sr-only">
          Ask anything about your MongoDB data
        </label>
        <textarea
          id="chat-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          rows={2}
          disabled={isStreaming}
          placeholder="Ask anything about your MongoDB data…"
          aria-label="Ask anything about your MongoDB data"
          className={cn(
            "w-full resize-none rounded-[10px] border border-argus-border bg-argus-bg-sunken",
            "py-3 pl-4 pr-14 font-mono text-sm text-argus-text",
            "placeholder:font-mono placeholder:text-argus-text-subtle",
            "focus:border-argus-accent focus:outline-none focus:ring-1 focus:ring-argus-accent/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-[border-color,box-shadow]",
          )}
        />
        <button
          type="submit"
          disabled={!value.trim() || isStreaming}
          aria-label="Send message"
          className={cn(
            "absolute right-2.5 bottom-2.5",
            "inline-flex h-[40px] w-[40px] items-center justify-center rounded-[8px]",
            "bg-argus-accent text-argus-primary-fg",
            "transition-[opacity,transform] hover:opacity-90 active:scale-[0.96]",
            "disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </form>

      <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] text-argus-text-subtle">
        <Lock className="h-3 w-3" aria-hidden />
        Read-only · Enter to send · Shift+Enter for newline
      </p>
    </div>
  );
}
