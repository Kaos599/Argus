"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { DashboardMockup } from "./DashboardMockup";

const STAGGER = 0.08;
const BASE_DURATION = 0.4;

export function HeroSection() {
  return (
    <section className="relative min-h-screen pt-14 flex flex-col overflow-hidden border-b border-argus-border">
      {/* Background dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--argus-border) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.7,
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 15%, black 80%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 15%, black 80%, transparent 100%)",
        }}
      />

      {/* Subtle teal bloom top-left */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--argus-accent) 6%, transparent) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-screen-xl px-6 pt-20 pb-16 md:pt-28 md:pb-0 flex-1 grid md:grid-cols-[1fr_1fr] gap-16 items-start">
        {/* Left column: headline + input */}
        <div className="flex flex-col">
          {/* Label chip */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: BASE_DURATION, ease: "easeOut", delay: 0 * STAGGER }}
          >
            <span className="inline-flex items-center gap-2 rounded border border-argus-border bg-argus-bg-elevated px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-argus-text-muted">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-argus-accent" aria-hidden />
              Agentic analyst · MongoDB Atlas
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: BASE_DURATION, ease: "easeOut", delay: 1 * STAGGER }}
            className="mt-6 font-heading text-[3.25rem] leading-[1.05] tracking-[-0.03em] text-argus-text md:text-[4rem] lg:text-[4.5rem]"
          >
            Paste a{" "}
            <br className="hidden lg:block" />
            connection string.
            <br />
            <span className="text-argus-accent">Get an analyst.</span>
          </motion.h1>

          {/* Subline */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: BASE_DURATION, ease: "easeOut", delay: 2 * STAGGER }}
            className="mt-6 max-w-md text-base leading-relaxed text-argus-text-muted"
          >
            Schema-blind by design. Argus samples your MongoDB collections,
            proposes 5 insight modules, and streams a live dashboard in 2–3
            minutes. No queries to write. No frontend to build.
          </motion.p>

          {/* Connection string input */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: BASE_DURATION, ease: "easeOut", delay: 3 * STAGGER }}
            className="mt-10"
          >
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-argus-text-subtle">
              Your connection string
            </p>
            <div className="flex items-stretch rounded border border-argus-border-strong bg-argus-bg-elevated overflow-hidden">
              <div className="flex-1 px-4 py-3 font-mono text-sm text-argus-text-muted tabular-nums select-none border-r border-argus-border overflow-hidden text-ellipsis whitespace-nowrap">
                mongodb+srv://judge:
                <span className="text-argus-text-subtle">••••••</span>
                @cluster0.mongodb.net
              </div>
              <Link
                href="/connect"
                className="inline-flex items-center gap-1.5 px-4 py-3 bg-argus-accent text-argus-bg text-xs font-semibold tracking-wide transition-[transform,opacity] duration-200 hover:opacity-90 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-argus-accent focus-visible:ring-offset-1 focus-visible:ring-offset-argus-bg whitespace-nowrap"
                aria-label="Connect your database"
              >
                Connect
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
            <p className="mt-2 font-mono text-[10px] text-argus-text-subtle">
              Read-only by default — three layers of write protection.
            </p>
          </motion.div>

          {/* Timeline steps */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: BASE_DURATION, ease: "easeOut", delay: 4 * STAGGER }}
            className="mt-10 grid grid-cols-3 gap-4"
          >
            {[
              { step: "01", label: "Connect", detail: "2–3 s probe" },
              { step: "02", label: "Sample", detail: "100 docs / collection" },
              { step: "03", label: "Dashboard", detail: "2–3 min total" },
            ].map(({ step, label, detail }) => (
              <div key={step} className="flex flex-col gap-1">
                <span className="font-mono text-[10px] text-argus-text-subtle">{step}</span>
                <span className="text-sm font-medium text-argus-text">{label}</span>
                <span className="font-mono text-[10px] text-argus-text-subtle">{detail}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right column: dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          className="hidden md:block self-start sticky top-20"
        >
          <DashboardMockup />
        </motion.div>
      </div>
    </section>
  );
}
