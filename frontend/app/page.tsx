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
      <header className="border-b border-argus-border">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold">
            <Eye className="h-5 w-5 text-argus-primary" aria-hidden />
            Argus
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/connect"
              className="inline-flex h-9 items-center rounded-sm px-3 text-sm text-argus-text-muted hover:bg-argus-bg-sunken hover:text-argus-text"
            >
              Connect
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center rounded-sm px-3 text-sm text-argus-text-muted hover:bg-argus-bg-sunken hover:text-argus-text"
            >
              Dashboard
            </Link>
            <Link
              href="/chat"
              className="inline-flex h-9 items-center rounded-sm px-3 text-sm text-argus-text-muted hover:bg-argus-bg-sunken hover:text-argus-text"
            >
              Chat
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-screen-xl px-4 py-16 md:py-24">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-argus-border bg-argus-bg-elevated px-3 py-1 text-xs text-argus-text-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-argus-accent" aria-hidden />
              Three layers of write protection. Read-only by design.
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              The all-seeing eye for your MongoDB data.
            </h1>
            <p className="mt-4 text-lg text-argus-text-muted">
              Paste a connection string. Argus samples the schema, generates a
              draft dashboard, and lets you chat with your data — all without
              ever writing to your cluster.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/connect"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-argus-primary px-5 text-sm font-semibold text-argus-primary-fg hover:opacity-90"
              >
                Connect your MongoDB
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/chat"
                className="inline-flex h-11 items-center gap-2 rounded-md border border-argus-border bg-argus-bg px-5 text-sm font-medium text-argus-text hover:bg-argus-bg-elevated"
              >
                Try the chat
              </Link>
            </div>
          </div>

          {/* 3-box architecture diagram */}
          <div className="rounded-lg border border-argus-border bg-argus-bg-elevated p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-argus-text-subtle">
              How it works
            </p>
            <div className="mt-4 space-y-3">
              <ArchBox
                n={1}
                title="Vercel — Next.js frontend"
                body="Tambo React SDK drives the generative UI. 7 Zod-validated cards."
              />
              <ArchBox
                n={2}
                title="Cloud Run — self-hosted Tambo"
                body="LLM: Gemini 3 Flash. Per-tenant mcp_manager + result_set_guard."
              />
              <ArchBox
                n={3}
                title="Your MongoDB"
                body="Read-only user. No writes can reach the cluster."
                muted
              />
            </div>
          </div>
        </div>
      </section>

      {/* Video */}
      <section className="mx-auto max-w-screen-xl px-4 pb-16">
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-argus-border bg-argus-bg-sunken">
          <iframe
            width="100%"
            height="100%"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ"
            title="Argus demo video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
            loading="lazy"
          />
        </div>
      </section>

      {/* 5 insight modules */}
      <section className="border-y border-argus-border bg-argus-bg-elevated">
        <div className="mx-auto max-w-screen-xl px-4 py-16">
          <h2 className="text-2xl font-bold">Five insight modules</h2>
          <p className="mt-2 text-argus-text-muted">
            Each module is generated from the schema, then run as a MongoDB
            aggregation. Ask in chat, or accept the planner&apos;s draft.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map(({ Icon, title, blurb }) => (
              <article
                key={title}
                className="rounded-md border border-argus-border bg-argus-bg p-5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-argus-info-bg text-argus-primary">
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-argus-text-muted">{blurb}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-screen-xl px-4 py-16">
        <h2 className="text-2xl font-bold">From paste to first dashboard in 2–3 minutes</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          <HowStep n={1} title="Connect" body="Paste a connection string. We probe the cluster for reachability." />
          <HowStep n={2} title="Sample" body="We sample the top 5 collections and feed the schema to the planner LLM." />
          <HowStep n={3} title="Insight" body="You get a draft dashboard. Drag, drop, resize, or ask in chat for more." />
        </ol>
      </section>

      {/* Read-only banner */}
      <section className="mx-auto max-w-screen-xl px-4 pb-16">
        <div className="rounded-lg border border-argus-accent/40 bg-argus-success-bg/40 p-6">
          <h2 className="inline-flex items-center gap-2 text-base font-semibold text-argus-accent">
            <Lock className="h-4 w-4" aria-hidden />
            Read-only by default. Three layers.
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-argus-text">
            {READ_ONLY_LAYERS.map((layer, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-argus-accent text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <span>{layer}</span>
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

function ArchBox({
  n,
  title,
  body,
  muted,
}: {
  n: number;
  title: string;
  body: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-4 ${
        muted
          ? "border-dashed border-argus-border bg-argus-bg"
          : "border-argus-border bg-argus-bg"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-argus-text-subtle">
        {n}
      </p>
      <p className="mt-1 text-sm font-semibold">{title}</p>
      <p className="mt-0.5 text-xs text-argus-text-muted">{body}</p>
    </div>
  );
}

function HowStep({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="rounded-md border border-argus-border bg-argus-bg-elevated p-5">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-argus-primary text-xs font-bold text-argus-primary-fg">
        {n}
      </span>
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-argus-text-muted">{body}</p>
    </li>
  );
}
