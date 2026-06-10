"use client";

import { useEffect, useRef } from "react";
import { Loader2, Lock, Send, Sparkles, User } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { CardRenderer } from "@/cards";
import { useChat } from "@/lib/chat";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const { messages, value, setValue, submit, isStreaming, suggestions } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  return (
    <>
      <TopBar />
      <main
        id="main-content"
        className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-3xl flex-col px-4"
      >
        <header className="border-b border-argus-border py-4">
          <h1 className="inline-flex items-center gap-2 font-heading text-xl font-semibold">
            <Sparkles className="h-5 w-5 text-argus-accent" aria-hidden />
            Chat with your data
          </h1>
          <p className="mt-1 text-xs text-argus-text-muted">
            Read-only by design. Try &ldquo;drop the users collection&rdquo; to see the
            refusal.
          </p>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 space-y-5 overflow-y-auto py-4"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
          {messages.map((m, i) => (
            <div
              key={m.id}
              className={cn(
                "animate-fade-in-up",
                i > 0 && "argus-stagger-1",
              )}
              style={{ animationFillMode: "forwards" }}
            >
              <Message message={m} />
            </div>
          ))}
          {isStreaming && (
            <div className="flex items-center gap-2.5 rounded-[12px] border border-argus-border bg-argus-bg-elevated px-4 py-3 text-xs text-argus-text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-argus-accent" aria-hidden />
              Argus is thinking…
            </div>
          )}
        </div>

        <div className="border-t border-argus-border py-3">
          {suggestions.length > 0 && (
            <div className="mb-3 flex gap-2 overflow-x-auto">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setValue(s);
                    requestAnimationFrame(() => {
                      const form = document.getElementById("chat-form") as HTMLFormElement | null;
                      if (form) form.requestSubmit();
                    });
                  }}
                  className="inline-flex h-8 flex-shrink-0 items-center rounded-[8px] border border-argus-border bg-argus-bg-elevated px-3 text-xs text-argus-text-muted transition-colors hover:border-argus-accent hover:text-argus-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <form
            id="chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            className="flex items-end gap-2"
          >
            <label htmlFor="chat-input" className="sr-only">
              Send a message
            </label>
            <textarea
              id="chat-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              rows={2}
              placeholder="Ask anything about your MongoDB data…"
              className="flex-1 resize-none rounded-[10px] border border-argus-border bg-argus-bg-sunken p-3 text-sm text-argus-text placeholder:text-argus-text-subtle transition-colors focus:border-argus-accent focus:outline-none focus:ring-1 focus:ring-argus-accent/20"
            />
            <button
              type="submit"
              disabled={!value.trim() || isStreaming}
              className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-argus-accent text-black transition-all hover:scale-[1.02] disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-4 w-4" aria-hidden />
            </button>
          </form>
          <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-argus-text-subtle">
            <Lock className="h-3 w-3" aria-hidden />
            All responses are read-only. Argus can never write to your cluster.
          </p>
        </div>
      </main>
    </>
  );
}

function Message({ message }: { message: ReturnType<typeof useChat>["messages"][number] }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] bg-argus-accent/10 text-argus-accent" aria-hidden>
          <Sparkles className="h-4 w-4" />
        </div>
      )}
      <div className={cn("max-w-[80%]", isUser && "text-right")}>
        {message.content && (
          <div
            className={cn(
              "rounded-[12px] border px-4 py-3 text-sm leading-relaxed",
              isUser
                ? "border-argus-accent/20 bg-argus-accent/[0.04] text-argus-text"
                : "border-argus-border bg-argus-bg-elevated text-argus-text",
            )}
          >
            {message.content}
          </div>
        )}
        {message.card && (
          <div className="mt-3 text-left">
            <div className="min-h-[200px]">
              <CardRenderer descriptor={message.card} />
            </div>
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] bg-argus-bg-sunken text-argus-text-muted" aria-hidden>
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
