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
        "inline-flex items-center gap-1 rounded-md border border-argus-border bg-argus-bg-elevated p-1",
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
              "inline-flex h-8 w-8 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 items-center justify-center rounded-sm transition-colors",
              active
                ? "bg-argus-bg text-argus-text shadow-sm"
                : "text-argus-text-muted hover:text-argus-text",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
