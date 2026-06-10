"use client";

import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";
import { Monitor, Moon, Sun } from "lucide-react";

const OPTIONS: Array<{ value: "system" | "light" | "dark"; label: string; Icon: typeof Monitor }> = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-[8px] border border-argus-border bg-argus-bg p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-[6px] transition-all duration-150",
              active
                ? "bg-argus-bg-elevated text-argus-text shadow-sm"
                : "text-argus-text-muted hover:text-argus-text",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
