"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, LayoutGrid, MessageSquare, Menu, X, Database, Lock } from "lucide-react";
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

  const statusDotClass =
    status === "ok"
      ? "bg-argus-accent"
      : status === "degraded"
        ? "bg-argus-warning"
        : "bg-argus-danger";

  const statusLabel =
    status === "ok" ? "Operational" : status === "degraded" ? "Degraded" : "Down";

  return (
    <header className="sticky top-0 z-40 border-b border-argus-border bg-argus-bg-elevated/90 backdrop-blur-md supports-[backdrop-filter]:bg-argus-bg-elevated/70">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-4 px-4">
        {/* Left: logo + nav */}
        <div className="flex items-center gap-5">
          {/* Logo tile */}
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-argus-accent focus-visible:ring-offset-2"
            aria-label="Argus home"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-argus-border-strong bg-argus-bg-elevated transition-colors duration-150 group-hover:border-argus-accent/40">
              <Eye className="h-4 w-4 text-argus-accent" aria-hidden />
            </span>
            <span
              className="font-heading text-[15px] font-semibold tracking-tight text-argus-text"
              style={{ fontFamily: "var(--argus-font-heading)" }}
            >
              Argus
            </span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Primary navigation" className="hidden md:block">
            <ul className="flex items-center gap-0.5" role="list">
              {NAV_ITEMS.map(({ href, label, Icon }) => {
                const active = pathname?.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative inline-flex h-8 items-center gap-1.5 rounded-[6px] px-3 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-argus-accent",
                        active
                          ? "bg-argus-bg-sunken text-argus-text"
                          : "text-argus-text-muted hover:bg-argus-bg-sunken/60 hover:text-argus-text",
                      )}
                    >
                      {active && (
                        <span
                          className="absolute bottom-0 left-1/2 h-px w-4 -translate-x-1/2 rounded-full bg-argus-accent"
                          aria-hidden
                        />
                      )}
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Right: badges + controls */}
        <div className="flex items-center gap-2">
          {/* READ-ONLY lock badge */}
          <span
            className="hidden items-center gap-1.5 rounded-full border border-argus-border bg-argus-bg px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-argus-text-muted sm:inline-flex"
            aria-label="Read-only mode — Argus cannot write to your database"
            title="Argus is read-only by design. All three protection layers are active."
          >
            <Lock className="h-3 w-3 text-argus-text-subtle" aria-hidden />
            Read-only
          </span>

          {/* Session chip */}
          {token && (
            <div
              className="hidden items-center gap-1.5 rounded-full border border-argus-border bg-argus-bg px-2.5 py-1 md:flex"
              title={`Session: ${token}`}
            >
              <Database className="h-3 w-3 text-argus-accent shrink-0" aria-hidden />
              <span
                className="font-mono text-[11px] text-argus-text-muted"
                style={{ fontFamily: "var(--argus-font-mono)" }}
              >
                {token.slice(0, 8)}&hellip;
              </span>
              <button
                type="button"
                onClick={clear}
                className="rounded-sm px-1 py-0.5 text-[11px] text-argus-text-subtle transition-colors duration-100 hover:text-argus-text active:scale-[0.96] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-argus-accent"
                aria-label="Disconnect current session"
              >
                ×
              </button>
            </div>
          )}

          {/* Health indicator */}
          <div
            className="hidden items-center gap-1.5 rounded-full border border-argus-border bg-argus-bg px-2.5 py-1 sm:inline-flex"
            aria-label={`System status: ${statusLabel}`}
            role="status"
          >
            <span
              className={cn("h-1.5 w-1.5 rounded-full transition-colors duration-300", statusDotClass)}
              aria-hidden
            />
            <span
              className="font-mono text-[11px] text-argus-text-muted"
              style={{ fontFamily: "var(--argus-font-mono)" }}
            >
              {statusLabel}
            </span>
          </div>

          <ThemeToggle className="hidden sm:inline-flex" />

          {/* Mobile hamburger */}
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-argus-text-muted transition-colors duration-100 hover:bg-argus-bg-sunken hover:text-argus-text active:scale-[0.96] md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-argus-accent"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-argus-border bg-argus-bg-elevated md:hidden"
        >
          <ul className="mx-auto flex max-w-screen-2xl flex-col gap-0.5 p-3" role="list">
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const active = pathname?.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-11 items-center gap-2.5 rounded-[8px] px-3 text-sm transition-colors duration-100",
                      active
                        ? "bg-argus-bg-sunken text-argus-text"
                        : "text-argus-text-muted hover:bg-argus-bg-sunken hover:text-argus-text",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {label}
                    {active && <span className="ml-auto h-1 w-1 rounded-full bg-argus-accent" aria-hidden />}
                  </Link>
                </li>
              );
            })}

            <li className="mt-1 flex items-center justify-between gap-2 border-t border-argus-border pt-2 px-3">
              <span className="text-xs text-argus-text-muted">Theme</span>
              <ThemeToggle />
            </li>

            <li className="flex items-center justify-between gap-2 px-3 py-1">
              <span className="flex items-center gap-1.5 font-mono text-xs text-argus-text-subtle">
                <Lock className="h-3 w-3" aria-hidden />
                Read-only
              </span>
              {token && (
                <button
                  type="button"
                  onClick={() => { clear(); setMenuOpen(false); }}
                  className="text-xs text-argus-text-muted hover:text-argus-text active:scale-[0.96] transition-colors duration-100"
                >
                  Disconnect
                </button>
              )}
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
