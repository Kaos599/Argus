"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TopBar } from "@/components/TopBar";
import { useChat } from "@/lib/chat";
import { UserMessage } from "@/components/chat/UserMessage";
import { AgentMessage } from "@/components/chat/AgentMessage";
import { StreamingIndicator } from "@/components/chat/StreamingIndicator";
import { SuggestedPrompts } from "@/components/chat/SuggestedPrompts";
import { ChatInput } from "@/components/chat/ChatInput";
import { EmptyState } from "@/components/chat/EmptyState";

function formatTime(now: Date) {
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPage() {
  const { messages, value, setValue, submit, isStreaming, suggestions } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;

  // Scroll to bottom when new messages arrive or streaming
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  const handleSelectPrompt = (prompt: string) => {
    setValue(prompt);
    requestAnimationFrame(() => {
      const form = document.getElementById("chat-form") as HTMLFormElement | null;
      if (form) form.requestSubmit();
    });
  };

  return (
    <>
      <TopBar />
      <main
        id="main-content"
        className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-3xl flex-col px-4"
      >
        {/* Page header */}
        <header className="flex items-baseline justify-between border-b border-argus-border py-4">
          <h1 className="font-heading text-base font-semibold text-argus-text">
            Chat
          </h1>
          <span className="font-mono text-[10px] uppercase tracking-wider text-argus-text-subtle">
            Read-only session
          </span>
        </header>

        {/* Message log */}
        <div
          ref={scrollRef}
          className="flex flex-1 flex-col overflow-y-auto py-4"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
          {!hasMessages ? (
            <EmptyState
              suggestions={suggestions}
              onSelectPrompt={handleSelectPrompt}
            />
          ) : (
            <AnimatePresence initial={false}>
              <div className="flex flex-col gap-6">
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {m.role === "user" ? (
                      <UserMessage
                        content={m.content}
                        timestamp={formatTime(new Date())}
                      />
                    ) : (
                      <AgentMessage
                        message={m}
                        timestamp={formatTime(new Date())}
                      />
                    )}
                  </motion.div>
                ))}

                {isStreaming && (
                  <motion.div
                    key="streaming"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <StreamingIndicator />
                  </motion.div>
                )}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* Suggested prompts — shown during conversation above input */}
        {hasMessages && suggestions.length > 0 && !isStreaming && (
          <div className="mb-3 overflow-x-auto border-t border-argus-border pt-3">
            <SuggestedPrompts
              suggestions={suggestions}
              onSelect={handleSelectPrompt}
              disabled={isStreaming}
            />
          </div>
        )}

        {/* Input bar */}
        <ChatInput
          value={value}
          onChange={setValue}
          onSubmit={() => void submit()}
          isStreaming={isStreaming}
        />
      </main>
    </>
  );
}
