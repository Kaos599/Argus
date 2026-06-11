"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Database, Eye, LayoutGrid, MessageSquare, Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";
import { useSessionToken } from "@/lib/session";
import { health } from "@/lib/api";
import type { HealthResponseType } from "@/types/api";

const NAV_ITEMS: Array<{ href: string; label: string; Icon: typeof Eye }> = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutGrid },
  { href: "/chat", label: "Chat", Icon: MessageSquare },
];

export function TopBar() {
  const pathname = usePathname();
  const { token, clear } = useSessionToken();
  const [healthState, setHealthState] = useState<HealthResponseType | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    health()
      .then((h) => {
        if (!cancelled) setHealthState(h);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const status = healthState?.status ?? "ok";
  const statusColor =
    status === "ok"
      ? "bg-argus-accent shadow-[0_0_6px_rgba(0,212,170,0.3)]"
      : status === "degraded"
        ? "bg-argus-warning"
        : "bg-argus-danger";

  return (
    <header className="sticky top-0 z-40 border-b border-argus-border bg-argus-bg-elevated/80 backdrop-blur-xl supports-[backdrop-filter]:bg-argus-bg-elevated/60">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-argus-text"
          >
            <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-argus-accent/10 argus-glow-accent">
              <Eye className="h-4 w-4 text-argus-accent" aria-hidden />
            </span>
            <span className="font-heading text-base">Argus</span>
          </Link>
          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {NAV_ITEMS.map(({ href, label, Icon }) => {
                const active = pathname?.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative inline-flex h-9 items-center gap-1.5 rounded-[8px] px-3 text-sm transition-colors",
                        active
                          ? "text-argus-text"
                          : "text-argus-text-muted hover:text-argus-text",
                      )}
                    >
                      {active && (
                        <span className="absolute inset-0 rounded-[8px] bg-argus-bg-sunken" />
                      )}
                      <Icon className="relative h-4 w-4" aria-hidden />
                      <span className="relative">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {token && (
            <div
              className="hidden items-center gap-2 text-xs text-argus-text-muted md:flex"
              title={`Session: ${token}`}
            >
              <Database className="h-3.5 w-3.5 text-argus-accent" aria-hidden />
              <span className="font-mono">{token.slice(0, 8)}…</span>
              <button
                type="button"
                onClick={clear}
                className="rounded-[6px] px-2 py-0.5 text-argus-text-subtle transition-colors hover:bg-argus-bg-sunken hover:text-argus-text"
              >
                Disconnect
              </button>
            </div>
          )}

          <div
            className="inline-flex items-center gap-1.5 rounded-full border border-argus-border bg-argus-bg px-2.5 py-1 text-xs"
            aria-label={`System status: ${status}`}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", statusColor)} aria-hidden />
            <span className="text-argus-text-muted">{status}</span>
          </div>

          <ThemeToggle className="hidden sm:inline-flex" />

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-argus-text-muted hover:bg-argus-bg-sunken md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          aria-label="Mobile"
          className="border-t border-argus-border bg-argus-bg-elevated md:hidden"
        >
          <ul className="mx-auto flex max-w-screen-2xl flex-col gap-1 p-3">
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const active = pathname?.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex h-11 items-center gap-2 rounded-[8px] px-3 text-sm",
                      active
                        ? "bg-argus-bg-sunken text-argus-text"
                        : "text-argus-text-muted hover:bg-argus-bg-sunken hover:text-argus-text",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
            <li className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="text-xs text-argus-text-muted">Theme</span>
              <ThemeToggle />
            </li>
            {token && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    clear();
                    setMenuOpen(false);
                  }}
                  className="flex h-11 w-full items-center gap-2 rounded-[8px] px-3 text-left text-sm text-argus-text-muted hover:bg-argus-bg-sunken"
                >
                  Disconnect
                </button>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
