"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ArrowRight, ShieldCheck, Cpu } from "lucide-react";
import { useRef } from "react";
import { GradientMesh } from "@/components/ui/gradient-mesh";
import { GenerativeUIMockup } from "@/components/GenerativeUIMockup";
import { EASE_OUT_EXPO } from "@/lib/motion";

const STAGGER_MS = 0.09;

function fadeUp(i: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: EASE_OUT_EXPO, delay: i * STAGGER_MS },
    },
  };
}

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden border-b border-argus-border"
    >
      {/* Background mesh — cyan only, no purple */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <GradientMesh
          className="opacity-85"
          colors={["#5BC8E0", "#38B6D4", "#A8EEF8"]}
          speed={1.8}
          scale={1.15}
          distortion={5}
          waveAmp={0.15}
          waveFreq={5}
          swirl={0.5}
        />
        {/* Fade-out at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[var(--argus-landing-bg)] to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-screen-xl px-6 py-24 md:py-36">
        <div className="grid gap-16 md:grid-cols-2 md:items-center">
          {/* Left column */}
          <div>
            {/* Badge */}
            <motion.div
              variants={fadeUp(0)}
              initial="initial"
              animate={inView ? "animate" : "initial"}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--argus-cyan-soft)] bg-white/70 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-argus-ink"
            >
              Built for MongoDB Atlas · works on free M0
            </motion.div>

            {/* H1 */}
            <h1 className="font-heading text-5xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">
              <motion.span
                variants={fadeUp(1)}
                initial="initial"
                animate={inView ? "animate" : "initial"}
                className="block text-argus-ink"
              >
                Connect your database.
              </motion.span>
              <motion.span
                variants={fadeUp(2)}
                initial="initial"
                animate={inView ? "animate" : "initial"}
                className="block text-argus-primary"
              >
                Get instant insights.
              </motion.span>
            </h1>

            {/* Subhead */}
            <motion.p
              variants={fadeUp(3)}
              initial="initial"
              animate={inView ? "animate" : "initial"}
              className="mt-6 max-w-lg text-lg leading-relaxed text-argus-text-muted font-medium"
            >
              You built the product. Your admin dashboard is still three hardcoded charts.
              Argus connects to your MongoDB read-only, reads your schema, and renders the
              dashboard your data actually deserves — live charts, on demand, no code.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeUp(4)}
              initial="initial"
              animate={inView ? "animate" : "initial"}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <Link
                href="/connect"
                className="group inline-flex h-11 min-h-[40px] items-center gap-2 rounded-full bg-argus-primary px-6 text-base font-semibold text-white transition-[background-color,transform] hover:bg-argus-primary-hover active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-argus-primary focus-visible:ring-offset-2"
              >
                Connect your database
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/chat"
                className="inline-flex h-11 min-h-[40px] items-center gap-2 rounded-full border border-argus-border bg-argus-bg-elevated px-6 text-base font-medium text-argus-text shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.05)] transition-[background-color,transform] hover:bg-argus-bg-sunken active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-argus-primary focus-visible:ring-offset-2"
              >
                Watch the 3-min demo
              </Link>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              variants={fadeUp(5)}
              initial="initial"
              animate={inView ? "animate" : "initial"}
              className="mt-8 flex items-center gap-6 text-sm font-semibold text-argus-text-muted"
            >
              <div className="flex items-center gap-1.5 min-h-[40px]">
                <ShieldCheck className="h-5 w-5 text-[var(--argus-success)]" />
                Zero write risk
              </div>
              <div className="flex items-center gap-1.5 min-h-[40px]">
                <Cpu className="h-5 w-5 text-argus-primary" />
                Generative UI
              </div>
            </motion.div>
          </div>

          {/* Right column — mockup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={
              inView
                ? {
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.6,
                      ease: EASE_OUT_EXPO,
                      delay: 0.25,
                    },
                  }
                : { opacity: 0, y: 20 }
            }
            className="hidden md:block"
          >
            <GenerativeUIMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
