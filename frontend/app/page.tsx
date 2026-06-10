"use client";

import Link from "next/link";
import {
  ArrowRight,
  Database,
  Eye,
  Lock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MODULES = [
  {
    Icon: TrendingUp,
    title: "Funnel",
    blurb: "Conversion rates between top events, computed in a single $facet round-trip.",
  },
  {
    Icon: Users,
    title: "Cohort",
    blurb: "Weekly retention by acquisition week. No SQL, no Tableau, no warehouse.",
  },
  {
    Icon: Database,
    title: "RFM",
    blurb: "Recency-Frequency-Monetary segmentation on a 5×5 grid.",
  },
  {
    Icon: Workflow,
    title: "Attribution",
    blurb: "First-touch attribution. Markov and Shapley are on the roadmap.",
  },
  {
    Icon: Sparkles,
    title: "Anomaly",
    blurb: "Z-score on daily metrics vs the trailing 28-day mean.",
  },
];

const READ_ONLY_LAYERS = [
  "MCP server runs with MDB_MCP_READ_ONLY=true — write tools are stripped at startup.",
  "Onboarding recommends a read-only database user.",
  "argus-result-set-guard blocks $out / $merge at the planner layer, before MongoDB sees them.",
];

export default function Landing() {
  return (
    <main id="main-content" className="min-h-screen bg-argus-bg text-argus-text">
      {/* Top nav */}
      <header className="border-b border-argus-border bg-argus-bg-elevated/60 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold">
            <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-argus-accent/10">
              <Eye className="h-4 w-4 text-argus-accent" aria-hidden />
            </span>
            <span className="font-heading text-base">Argus</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/connect"
              className="inline-flex h-9 items-center rounded-[8px] px-3 text-sm text-argus-text-muted transition-colors hover:bg-argus-bg-sunken hover:text-argus-text"
            >
              Connect
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center rounded-[8px] px-3 text-sm text-argus-text-muted transition-colors hover:bg-argus-bg-sunken hover:text-argus-text"
            >
              Dashboard
            </Link>
            <Link
              href="/chat"
              className="inline-flex h-9 items-center rounded-[8px] px-3 text-sm text-argus-text-muted transition-colors hover:bg-argus-bg-sunken hover:text-argus-text"
            >
              Chat
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — full bleed, gradient mesh bg */}
      <section className="argus-gradient-hero relative overflow-hidden border-b border-argus-border">
        <div className="mx-auto max-w-screen-xl px-4 py-20 md:py-28">
          <div className="grid gap-16 md:grid-cols-2 md:items-center">
            <div className="animate-fade-in-up">
              <p className="inline-flex items-center gap-1.5 rounded-full border border-argus-accent/20 bg-argus-accent/5 px-3 py-1 text-xs font-medium text-argus-accent">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                Three layers of write protection
              </p>
              <h1 className="mt-6 font-heading text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
                The all-seeing eye
                <br />
                <span className="text-argus-accent">for your MongoDB data.</span>
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-argus-text-muted md:text-lg">
                Paste a connection string. Argus samples the schema, generates a
                draft dashboard, and lets you chat with your data — all without
                ever writing to your cluster.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/connect"
                  className="group inline-flex h-12 items-center gap-2 rounded-[10px] bg-argus-accent px-6 text-sm font-semibold text-black transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(0,212,170,0.25)]"
                >
                  Connect your MongoDB
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                </Link>
                <Link
                  href="/chat"
                  className="inline-flex h-12 items-center gap-2 rounded-[10px] border border-argus-border bg-argus-bg-elevated px-6 text-sm font-medium text-argus-text transition-all duration-200 hover:border-argus-text-muted hover:bg-argus-bg"
                >
                  Try the chat
                </Link>
              </div>
            </div>

            {/* Architecture diagram — reimagined as connected nodes */}
            <div className="animate-fade-in-up argus-stagger-3 relative">
              <div className="rounded-[16px] border border-argus-border bg-argus-bg-elevated/50 argus-glass p-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-argus-text-subtle">
                  Architecture
                </p>
                <div className="mt-6 space-y-0">
                  <ArchNode
                    n={1}
                    title="Vercel — Next.js"
                    body="Tambo React SDK drives the generative UI. 7 Zod-validated cards."
                    accent
                  />
                  <div className="flex justify-center py-1">
                    <svg width="2" height="24" className="text-argus-border-strong" fill="currentColor">
                      <line x1="1" y1="0" x2="1" y2="24" strokeWidth="2" stroke="currentColor" strokeDasharray="2 3" />
                    </svg>
                  </div>
                  <ArchNode
                    n={2}
                    title="Cloud Run — Tambo"
                    body="LLM: Gemini 3 Flash. Per-tenant mcp_manager + result_set_guard."
                  />
                  <div className="flex justify-center py-1">
                    <svg width="2" height="24" className="text-argus-border-strong" fill="currentColor">
                      <line x1="1" y1="0" x2="1" y2="24" strokeWidth="2" stroke="currentColor" strokeDasharray="2 3" />
                    </svg>
                  </div>
                  <ArchNode
                    n={3}
                    title="Your MongoDB"
                    body="Read-only user. No writes can reach the cluster."
                    muted
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5 insight modules — glass cards with staggered reveal */}
      <section className="border-b border-argus-border bg-argus-bg-sunken/50">
        <div className="mx-auto max-w-screen-xl px-4 py-20">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-heading text-3xl font-bold">Five insight modules</h2>
            <p className="mt-3 text-argus-text-muted">
              Each module is generated from the schema, then run as a MongoDB
              aggregation. Ask in chat, or accept the planner&apos;s draft.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map(({ Icon, title, blurb }, i) => (
              <article
                key={title}
                className={cn(
                  "group animate-fade-in-up rounded-[12px] border border-argus-border bg-argus-bg-elevated p-6 opacity-0 transition-all duration-300 hover:border-argus-accent/20 hover:shadow-[0_0_24px_rgba(0,212,170,0.06)]",
                  `argus-stagger-${i + 1}`,
                )}
                style={{ animationFillMode: "forwards" }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-argus-accent/10 text-argus-accent transition-colors group-hover:bg-argus-accent/20">
                  <Icon className="h-4.5 w-4.5" aria-hidden />
                </div>
                <h3 className="mt-5 font-heading text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-argus-text-muted">{blurb}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — 3-step flow */}
      <section className="mx-auto max-w-screen-xl px-4 py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-heading text-3xl font-bold">From paste to first dashboard in 2–3 minutes</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <HowStep n={1} title="Connect" body="Paste a connection string. We probe the cluster for reachability." />
          <HowStep n={2} title="Sample" body="We sample the top 5 collections and feed the schema to the planner LLM." />
          <HowStep n={3} title="Insight" body="You get a draft dashboard. Drag, drop, resize, or ask in chat for more." />
        </div>
      </section>

      {/* Read-only banner */}
      <section className="mx-auto max-w-screen-xl px-4 pb-20">
        <div className="rounded-[16px] border border-argus-accent/15 bg-gradient-to-br from-argus-accent/[0.03] to-transparent p-8 md:p-10">
          <h2 className="inline-flex items-center gap-2 font-heading text-lg font-semibold text-argus-accent">
            <Lock className="h-4 w-4" aria-hidden />
            Read-only by default. Three layers.
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-3">
            {READ_ONLY_LAYERS.map((layer, i) => (
              <li key={i} className="flex gap-3 rounded-[10px] border border-argus-border bg-argus-bg-elevated/50 p-4 text-sm leading-relaxed text-argus-text-muted">
                <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-argus-accent/10 text-[10px] font-bold text-argus-accent">
                  {i + 1}
                </span>
                {layer}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-argus-border">
        <div className="mx-auto flex max-w-screen-xl flex-col items-start gap-2 px-4 py-8 text-xs text-argus-text-subtle md:flex-row md:items-center md:justify-between">
          <p>© Argus. Built for the 2026 MongoDB AI Hackathon.</p>
          <p>Open source, self-hosted, free.</p>
        </div>
      </footer>
    </main>
  );
}

function ArchNode({
  n,
  title,
  body,
  muted,
  accent,
}: {
  n: number;
  title: string;
  body: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[12px] border p-5 transition-all duration-200",
        muted && "border-dashed border-argus-border bg-argus-bg-sunken/30",
        accent && "border-argus-accent/15 bg-argus-accent/[0.02]",
        !muted && !accent && "border-argus-border bg-argus-bg-elevated",
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-[6px] text-[11px] font-bold",
          accent ? "bg-argus-accent/20 text-argus-accent" : "bg-argus-bg-sunken text-argus-text-subtle",
        )}>
          {n}
        </span>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-argus-text-muted">{body}</p>
    </div>
  );
}

function HowStep({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="animate-fade-in-up rounded-[12px] border border-argus-border bg-argus-bg-elevated p-6 opacity-0"
      style={{ animationDelay: `${n * 0.15}s`, animationFillMode: "forwards" }}>
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-argus-accent/10 text-sm font-bold text-argus-accent">
        {n}
      </span>
      <h3 className="mt-4 font-heading text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-argus-text-muted">{body}</p>
    </div>
  );
}
