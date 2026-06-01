"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Eye,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { connect } from "@/lib/api";
import type { ConnectResponseType } from "@/types/api";
import { setSessionToken } from "@/lib/session";
import { ErrorCard } from "@/cards/ErrorCard";
import { TopBar } from "@/components/TopBar";

const RISKS = [
  "Argus is a read-only tool by design. Three layers of write protection are in place, but you should still treat your production connection string as sensitive.",
  "The connection string may be stored in memory on the backend (Cloud Run) for the duration of your session. It is never persisted to disk and never exposed to the browser.",
  "We recommend creating a dedicated read-only user in MongoDB Atlas (e.g. readAnyDatabase role) and using that for the demo.",
  "Argus has no API-level authentication in v1. Anyone with the session token URL can access your data. Do not share the dashboard URL.",
  "PII fields (email, phone, name, address) are not redacted in v1. Use a sandbox cluster for the demo to avoid accidentally exposing user data.",
];

const CONN_STRING_PATTERN = /^mongodb(\+srv)?:\/\//;

type Status = "idle" | "probing" | "ready" | "error";

export default function ConnectPage() {
  const router = useRouter();
  const [connString, setConnString] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<ConnectResponseType["error"] | null>(null);
  const [sessionToken, setLocalToken] = useState<string | null>(null);

  const isValidFormat = CONN_STRING_PATTERN.test(connString.trim());
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
        // Brief pause so the user sees the "ready" status pill
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

  return (
    <>
      <TopBar />
      <main
        id="main-content"
        className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-2xl flex-col gap-8 px-4 py-12"
      >
        <header>
          <p className="inline-flex items-center gap-2 text-xs text-argus-text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-argus-accent" aria-hidden />
            Read-only by design
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Connect your MongoDB Atlas cluster
          </h1>
          <p className="mt-2 text-argus-text-muted">
            Paste a connection string. We&apos;ll probe the cluster for reachability
            and ask for the read-only user we recommend.
          </p>
        </header>

        <form
          onSubmit={handleConnect}
          className="space-y-6 rounded-lg border border-argus-border bg-argus-bg-elevated p-6"
        >
          <div>
            <label
              htmlFor="conn-string"
              className="block text-sm font-medium text-argus-text"
            >
              Connection string
            </label>
            <textarea
              id="conn-string"
              value={connString}
              onChange={(e) => setConnString(e.target.value)}
              placeholder="mongodb+srv://user:pass@cluster.mongodb.net/dbname"
              rows={3}
              spellCheck={false}
              className="mt-2 block w-full resize-y rounded-md border border-argus-border bg-argus-bg-sunken p-3 font-mono text-xs text-argus-text placeholder:text-argus-text-subtle focus:border-argus-primary focus:outline-none"
            />
            {connString && !isValidFormat && (
              <p className="mt-1 text-xs text-argus-danger">
                Must start with <code>mongodb://</code> or{" "}
                <code>mongodb+srv://</code>
              </p>
            )}
            <p className="mt-1 text-xs text-argus-text-subtle">
              The connection string is never sent to the browser after submit.
            </p>
          </div>

          <fieldset className="space-y-3">
            <legend className="block text-sm font-medium text-argus-text">
              I understand the risks
            </legend>
            <ul className="space-y-2 rounded-md border border-argus-border bg-argus-bg p-3 text-xs text-argus-text-muted">
              {RISKS.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-argus-bg-sunken text-[10px] font-bold text-argus-text">
                    {i + 1}
                  </span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
            <label className="flex h-11 cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded-sm border-argus-border accent-argus-primary"
              />
              <span>
                I&apos;ve read and understood the 5 risks above. I will use a
                read-only user (or a sandbox cluster) for the demo.
              </span>
            </label>
          </fieldset>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatusPill status={status} sessionToken={sessionToken} />
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-md px-5 text-sm font-semibold transition-colors",
                canSubmit
                  ? "bg-argus-primary text-argus-primary-fg hover:opacity-90"
                  : "cursor-not-allowed bg-argus-bg-sunken text-argus-text-subtle",
              )}
            >
              {status === "probing" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Probing…
                </>
              ) : (
                <>Connect</>
              )}
            </button>
          </div>

          {error && (
            <ErrorCard
              title={error.title ?? "Connection failed"}
              message={error.message ?? ""}
              guidance={error.guidance}
              isReadOnlyViolation={error.isReadOnlyViolation}
              isRetryable={error.isRetryable}
              isFullPage={false}
            />
          )}
        </form>

        {/* Recommended read-only user */}
        <section className="rounded-lg border border-argus-border bg-argus-bg-elevated p-6">
          <h2 className="inline-flex items-center gap-2 text-base font-semibold">
            <Lock className="h-4 w-4 text-argus-accent" aria-hidden />
            Recommended: create a read-only user
          </h2>
          <p className="mt-1 text-sm text-argus-text-muted">
            In <code className="font-mono text-xs">mongosh</code>:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md bg-argus-bg-sunken p-3 font-mono text-xs text-argus-text">
{`use admin
db.createUser({
  user: "argus_ro",
  pwd: "<a-strong-password>",
  roles: [{ role: "readAnyDatabase", db: "admin" }]
})`}
          </pre>
          <p className="mt-2 text-xs text-argus-text-subtle">
            Then use the resulting connection string in the form above.
          </p>
        </section>

        <p className="text-center text-xs text-argus-text-subtle">
          Want to skip the connect step?{" "}
          <Link href="/dashboard" className="text-argus-primary hover:underline">
            Go straight to the dashboard
          </Link>{" "}
          (mock data).
        </p>
      </main>
    </>
  );
}

function StatusPill({
  status,
  sessionToken,
}: {
  status: Status;
  sessionToken: string | null;
}) {
  if (status === "idle") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-argus-border bg-argus-bg px-2 py-1 text-xs text-argus-text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-argus-text-subtle" aria-hidden />
        Idle
      </span>
    );
  }
  if (status === "probing") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-argus-warning/40 bg-argus-warning-bg/40 px-2 py-1 text-xs text-argus-warning">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        Probing cluster
      </span>
    );
  }
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-argus-accent/40 bg-argus-success-bg/40 px-2 py-1 text-xs text-argus-accent">
        <Check className="h-3 w-3" aria-hidden />
        Ready · {sessionToken?.slice(0, 8) ?? ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-argus-danger/40 bg-argus-danger-bg/40 px-2 py-1 text-xs text-argus-danger">
      <AlertTriangle className="h-3 w-3" aria-hidden />
      Error
    </span>
  );
}
