"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { connect } from "@/lib/api";
import type { ConnectResponseType } from "@/types/api";
import { setSessionToken } from "@/lib/session";
import { ErrorCard } from "@/cards/ErrorCard";
import { TopBar } from "@/components/TopBar";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { RiskDisclosure, ReadOnlyAssurance } from "@/components/flow/RiskDisclosure";

// ─── Risk text (all 5 preserved) ──────────────────────────────────────────────
const RISKS = [
  "Argus is a read-only tool by design. Three layers of write protection are in place, but you should still treat your production connection string as sensitive.",
  "The connection string may be stored in memory on the backend (Cloud Run) for the duration of your session. It is never persisted to disk and never exposed to the browser.",
  "We recommend creating a dedicated read-only user in MongoDB Atlas (e.g. readAnyDatabase role) and using that for the demo.",
  "Argus has no API-level authentication in v1. Anyone with the session token URL can access your data. Do not share the dashboard URL.",
  "PII fields (email, phone, name, address) are not redacted in v1. Use a sandbox cluster for the demo to avoid accidentally exposing user data.",
];

const CONN_STRING_PATTERN = /^mongodb(\+srv)?:\/\//;

type Status = "idle" | "probing" | "ready" | "error";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConnectPage() {
  const router = useRouter();
  const [connString, setConnString] = useState("");
  const [showString, setShowString] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<ConnectResponseType["error"] | null>(null);
  const [sessionToken, setLocalToken] = useState<string | null>(null);

  const isValidFormat = CONN_STRING_PATTERN.test(connString.trim());
  const showValidationError = touched && connString.length > 0 && !isValidFormat;
  const canSubmit = isValidFormat && acknowledged && status !== "probing";

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("probing");
    setError(null);
    try {
      const res = await connect({
        connection_string: connString.trim(),
        acknowledged_risks: RISKS,
      });
      if (res.status === "error" && res.error) {
        setStatus("error");
        setError(res.error);
        return;
      }
      if (res.session_token) {
        setSessionToken(res.session_token);
        setLocalToken(res.session_token);
        setStatus("ready");
        setTimeout(() => router.push(`/onboarding?token=${res.session_token}`), 600);
      }
    } catch (err) {
      setStatus("error");
      setError({
        title: "Connection failed",
        message: err instanceof Error ? err.message : "Unknown error",
        isRetryable: true,
        isReadOnlyViolation: false,
        isFullPage: false,
        guidance: "Check that the connection string is correct and the cluster is reachable.",
      });
    }
  }

  const maskedValue = showString
    ? connString
    : connString.replace(/(?<=:\/\/[^:]+:)[^@]+(?=@)/, "••••••••");

  return (
    <>
      <TopBar />
      <main
        id="main-content"
        className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-[640px] flex-col gap-8 px-4 py-14 sm:px-6"
      >
        {/* ── Header ── */}
        <FlowHeader
          eyebrow={
            <>
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Step 1 of 2 · Connect
            </>
          }
          title="Connect your MongoDB Atlas cluster"
          description="Paste a connection string. Argus will probe for reachability, sample your schema, and generate a dashboard — without ever writing to your data."
        />

        {/* ── Main form ── */}
        <motion.form
          onSubmit={handleConnect}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-5 rounded-[12px] border border-argus-border bg-argus-bg-elevated p-6 sm:p-8"
        >
          {/* Connection string field */}
          <div>
            <label
              htmlFor="conn-string"
              className="block text-sm font-medium text-argus-text"
            >
              Connection string
            </label>
            <div className="relative mt-2">
              <textarea
                id="conn-string"
                value={showString ? connString : maskedValue}
                onChange={(e) => {
                  // Always update the real value
                  setConnString(e.target.value);
                }}
                onFocus={() => setShowString(true)}
                onBlur={() => {
                  setTouched(true);
                  setShowString(false);
                }}
                placeholder="mongodb+srv://user:pass@cluster.mongodb.net/dbname"
                rows={2}
                spellCheck={false}
                autoComplete="off"
                aria-describedby="conn-string-hint"
                aria-invalid={showValidationError}
                className={cn(
                  "block w-full resize-none rounded-[8px] border bg-argus-bg-sunken px-3 py-2.5 pr-10 font-mono text-xs leading-relaxed text-argus-text placeholder:text-argus-text-subtle transition-colors duration-150 focus:outline-none focus:ring-1",
                  showValidationError
                    ? "border-argus-danger focus:border-argus-danger focus:ring-argus-danger/20"
                    : "border-argus-border focus:border-argus-accent focus:ring-argus-accent/20",
                )}
              />
              {/* Show/hide toggle */}
              <button
                type="button"
                onClick={() => setShowString((v) => !v)}
                className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-[4px] text-argus-text-subtle transition-colors hover:text-argus-text"
                aria-label={showString ? "Hide credentials" : "Show credentials"}
              >
                {showString ? (
                  <EyeOff className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                )}
              </button>
            </div>
            {/* Inline validation error */}
            <AnimatePresence initial={false}>
              {showValidationError && (
                <motion.p
                  id="conn-string-error"
                  role="alert"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="mt-1.5 flex items-center gap-1.5 text-xs text-argus-danger"
                >
                  <AlertTriangle className="h-3 w-3 flex-shrink-0" aria-hidden />
                  Must start with{" "}
                  <code className="font-mono">mongodb://</code> or{" "}
                  <code className="font-mono">mongodb+srv://</code>.
                  Check your Atlas dashboard for the correct string.
                </motion.p>
              )}
            </AnimatePresence>
            <p
              id="conn-string-hint"
              className="mt-1.5 text-xs text-argus-text-subtle"
            >
              Credentials are masked at rest. The string is never sent back to the browser.
            </p>
          </div>

          {/* Risk disclosure */}
          <RiskDisclosure risks={RISKS} />

          {/* Acknowledge checkbox */}
          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-[3px] border-argus-border accent-[color:var(--argus-accent)]"
            />
            <span className="leading-relaxed text-argus-text-muted">
              I&apos;ve read the 5 points above. I will use a read-only user or a
              sandbox cluster.
            </span>
          </label>

          {/* Actions row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <StatusPill status={status} sessionToken={sessionToken} />
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                "inline-flex h-10 min-w-[120px] items-center justify-center gap-2 rounded-[8px] px-5 text-sm font-semibold transition-colors duration-150 active:scale-[0.96]",
                canSubmit
                  ? "bg-argus-accent text-argus-primary-fg hover:opacity-90"
                  : "cursor-not-allowed bg-argus-bg-sunken text-argus-text-subtle",
              )}
            >
              {status === "probing" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Probing…
                </>
              ) : (
                "Connect"
              )}
            </button>
          </div>

          {/* Error display */}
          <AnimatePresence initial={false}>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.18 }}
              >
                <ErrorCard
                  title={error.title ?? "Connection failed"}
                  message={error.message ?? ""}
                  guidance={error.guidance}
                  isReadOnlyViolation={error.isReadOnlyViolation}
                  isRetryable={error.isRetryable}
                  isFullPage={false}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.form>

        {/* ── Read-only assurance ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
          <ReadOnlyAssurance />
        </motion.div>

        {/* ── Recommended: read-only user setup ── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-[12px] border border-argus-border bg-argus-bg-elevated p-6 sm:p-8"
          aria-labelledby="readonly-user-heading"
        >
          <h2
            id="readonly-user-heading"
            className="flex items-center gap-2 font-heading text-sm font-semibold text-argus-text"
          >
            <Lock className="h-3.5 w-3.5 text-argus-accent" aria-hidden />
            Recommended: create a dedicated read-only user
          </h2>
          <p className="mt-1.5 text-xs text-argus-text-muted">
            Run in <code className="font-mono">mongosh</code> before connecting:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-[8px] bg-argus-bg-sunken p-4 font-mono text-xs leading-relaxed text-argus-text">
{`use admin
db.createUser({
  user: "argus_ro",
  pwd: "<strong-password>",
  roles: [{ role: "readAnyDatabase", db: "admin" }]
})`}
          </pre>
          <p className="mt-2.5 text-[11px] text-argus-text-subtle">
            Then paste the resulting connection string in the form above.
          </p>
        </motion.section>

        {/* ── Skip link ── */}
        <p className="text-center text-xs text-argus-text-subtle">
          Want to skip?{" "}
          <Link href="/dashboard" className="text-argus-accent underline-offset-2 hover:underline">
            Go to the dashboard with mock data
          </Link>
        </p>
      </main>
    </>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({
  status,
  sessionToken,
}: {
  status: Status;
  sessionToken: string | null;
}) {
  if (status === "idle") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-argus-border px-2.5 py-1 text-xs text-argus-text-subtle">
        <span className="h-1.5 w-1.5 rounded-full bg-argus-text-subtle" aria-hidden />
        Idle
      </span>
    );
  }
  if (status === "probing") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-argus-warning/30 bg-argus-warning-bg/30 px-2.5 py-1 text-xs text-argus-warning">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        Probing cluster
      </span>
    );
  }
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-argus-accent/30 bg-argus-accent/5 px-2.5 py-1 text-xs text-argus-accent">
        <Check className="h-3 w-3" aria-hidden />
        Ready · {sessionToken?.slice(0, 8) ?? ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-argus-danger/30 bg-argus-danger-bg/30 px-2.5 py-1 text-xs text-argus-danger">
      <AlertTriangle className="h-3 w-3" aria-hidden />
      Error
    </span>
  );
}
