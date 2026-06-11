"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { motion } from "framer-motion";

export function LandingNav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-argus-border bg-argus-bg/90 backdrop-blur-md"
    >
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-6">
        {/* Logo */}
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-argus-accent rounded-sm"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded border border-argus-border-strong bg-argus-bg-elevated transition-colors duration-200 group-hover:border-argus-accent">
            <Eye className="h-3.5 w-3.5 text-argus-text" strokeWidth={2} />
          </div>
          <span className="font-heading text-sm font-semibold tracking-wide text-argus-text">
            Argus
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Primary navigation">
          {[
            { href: "/connect", label: "Connect" },
            { href: "/dashboard", label: "Dashboard" },
            { href: "/chat", label: "Chat" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs font-medium tracking-wider text-argus-text-muted uppercase transition-colors duration-200 hover:text-argus-text focus-visible:text-argus-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <Link
          href="/connect"
          className="inline-flex h-8 min-w-[40px] items-center gap-1.5 rounded border border-argus-border-strong bg-argus-bg-elevated px-4 text-xs font-medium tracking-wide text-argus-text transition-[transform,opacity] duration-200 hover:border-argus-accent hover:text-argus-accent active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-argus-accent"
        >
          Get Started
        </Link>
      </div>
    </motion.header>
  );
}
