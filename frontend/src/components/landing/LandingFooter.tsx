"use client";

import Link from "next/link";
import { Eye } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-argus-border">
      <div className="mx-auto max-w-screen-xl px-6 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded border border-argus-border bg-argus-bg-elevated">
              <Eye className="h-3 w-3 text-argus-text-muted" strokeWidth={2} />
            </div>
            <span className="font-heading text-xs font-semibold text-argus-text-subtle">
              Argus
            </span>
          </div>

          {/* Hackathon line */}
          <p className="font-mono text-[10px] text-argus-text-subtle leading-relaxed text-center md:text-left max-w-sm">
            Built for the Google Cloud Rapid Agent Hackathon — MongoDB track.
            <br />
            © 2026 Argus.
          </p>

          {/* Links */}
          <nav className="flex items-center gap-6" aria-label="Footer navigation">
            {[
              { href: "#", label: "GitHub" },
              { href: "#", label: "Docs" },
              { href: "#", label: "Architecture" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-mono text-[10px] uppercase tracking-wider text-argus-text-subtle transition-colors duration-200 hover:text-argus-text focus-visible:text-argus-text"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
