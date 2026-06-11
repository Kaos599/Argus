"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  Loader2,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CardRenderer, ErrorCard } from "@/cards";
import { Card } from "@/components/ui/Card";
import { TopBar } from "@/components/TopBar";
import { cn } from "@/lib/utils";
import {
  plan,
  probe,
  renderStream,
  sample,
  saveLayout,
} from "@/lib/api";
import type {
  CardDescriptorType,
  PlanRequestType,
  PlanResponseType,
  RenderEventType,
  SampleResponseType,
} from "@/types/api";
import { FlowProgress } from "@/components/flow/FlowProgress";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { AgentTicker, useSimulatedTicker } from "@/components/flow/AgentTicker";

// ─── Constants ────────────────────────────────────────────────────────────────

const MODULES = [
  {
    key: "funnel",
    label: "Funnel",
    description: "Multi-step conversion analysis across your event stream.",
  },
  {
    key: "cohort",
    label: "Cohort",
    description: "Retention curves grouped by signup date or first action.",
  },
  {
    key: "rfm",
    label: "RFM",
    description: "Recency · Frequency · Monetary value segmentation.",
  },
  {
    key: "attribution",
    label: "Attribution",
    description: "First-touch and last-touch channel credit.",
  },
  {
    key: "anomaly",
    label: "Anomaly",
    description: "Statistical deviation flags on time-series metrics.",
  },
] as const;
type ModuleKey = (typeof MODULES)[number]["key"];

const STEPS = [
  "Schema sample",
  "Insight selection",
  "Plan preview",
  "Render",
  "Customize",
] as const;

// ─── Page shell ───────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <OnboardingFlow />
    </Suspense>
  );
}

function OnboardingSkeleton() {
  return (
    <div className="min-h-screen bg-argus-bg">
      <TopBar />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="h-6 w-48 animate-pulse rounded-[6px] bg-argus-bg-sunken" />
        <div className="mt-8 h-64 animate-pulse rounded-[12px] bg-argus-bg-sunken" />
      </main>
    </div>
  );
}

// ─── Main flow ────────────────────────────────────────────────────────────────

function OnboardingFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const tokenFromQuery = params.get("token");
  const token =
    tokenFromQuery ??
    (typeof window !== "undefined"
      ? window.localStorage.getItem("argus-session-token")
      : null);

  // ── All state preserved from original ──
  const [step, setStep] = useState(1);
  const [collections, setCollections] = useState<SampleResponseType["collections"]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<ModuleKey[]>(["funnel", "anomaly"]);
  const [planId, setPlanId] = useState<string | null>(null);
  const [planData, setPlanData] = useState<PlanResponseType["plan"]>([]);
  const [cards, setCards] = useState<CardDescriptorType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ticker lines from the render stream
  const [tickerLines, setTickerLines] = useState<string[]>([]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    probe(token)
      .catch(() => undefined)
      .finally(() => setLoading(false));
    sample(token)
      .then((res) => {
        setCollections(res.collections);
        setSelectedCollections(res.collections.slice(0, 5).map((c) => c.name));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Sample failed"));
  }, [token]);

  async function handleNext() {
    setError(null);
    try {
      if (step === 2) {
        setLoading(true);
        const res = await plan({
          session_token: token ?? "",
          collections: selectedCollections,
          modules: selectedModules,
        } as PlanRequestType);
        setPlanId(res.plan_id);
        setPlanData(res.plan);
        setStep(3);
        setLoading(false);
      } else if (step === 3) {
        if (!planId) {
          setStep(4);
          return;
        }
        setStep(4);
        setLoading(true);
        setTickerLines([]);
        const events: RenderEventType[] = [];
        for await (const ev of renderStream({
          session_token: token ?? "",
          plan_id: planId,
        })) {
          events.push(ev);
          if (ev.event === "card") {
            setCards((prev) => [...prev, ev.data]);
            setTickerLines((prev) => [
              ...prev,
              `rendered card: ${(ev.data as CardDescriptorType).componentName ?? "unknown"}`,
            ]);
          } else if (ev.event === "done") {
            setLoading(false);
            break;
          }
        }
        setLoading(false);
      } else if (step === 4) {
        setStep(5);
      } else if (step === 5) {
        await saveLayout({
          session_token: token ?? "",
          layout: {
            lg: cards.map((c, i) => ({
              i: `card-${i}`,
              x: (i * 4) % 12,
              y: Math.floor(i / 3) * 4,
              w: 4,
              h: 4,
            })),
            md: [],
            sm: [],
            xs: [],
          },
        });
        router.push("/dashboard");
      } else {
        setStep(step + 1);
      }
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  // ── No token fallback ──
  if (!token) {
    return (
      <>
        <TopBar />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="font-heading text-2xl font-bold text-argus-text">
            No session token
          </h1>
          <p className="mt-2 text-sm text-argus-text-muted">
            Start at the{" "}
            <Link href="/connect" className="text-argus-accent underline-offset-2 hover:underline">
              connect page
            </Link>
            .
          </p>
        </main>
      </>
    );
  }

  const canContinue =
    !loading &&
    !(step === 1 && selectedCollections.length === 0) &&
    !(step === 2 && selectedModules.length === 0);

  return (
    <>
      <TopBar />
      <main
        id="main-content"
        className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14"
      >
        {/* Progress bar */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
        >
          <FlowProgress steps={STEPS} current={step} />
        </motion.div>

        {/* Step content with slide animation */}
        <div className="mt-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {step === 1 && (
                <StepSchemaSample
                  collections={collections}
                  selected={selectedCollections}
                  onChange={setSelectedCollections}
                  loading={loading}
                />
              )}
              {step === 2 && (
                <StepInsightSelection
                  selected={selectedModules}
                  onChange={setSelectedModules}
                />
              )}
              {step === 3 && <StepPlanPreview plan={planData} />}
              {step === 4 && (
                <StepRender
                  cards={cards}
                  loading={loading}
                  tickerLines={tickerLines}
                />
              )}
              {step === 5 && <StepCustomize cards={cards} />}
            </motion.div>
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence initial={false}>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.18 }}
                className="mt-6"
              >
                <ErrorCard
                  title="Something went wrong"
                  message={error}
                  isRetryable
                  isFullPage={false}
                  isReadOnlyViolation={false}
                  guidance="Try going back a step and adjusting your selections."
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="inline-flex h-10 items-center gap-1.5 rounded-[8px] border border-argus-border bg-argus-bg-elevated px-4 text-sm text-argus-text transition-colors duration-150 hover:border-argus-border-strong active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canContinue}
              className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-argus-accent px-5 text-sm font-semibold text-argus-primary-fg transition-colors duration-150 hover:opacity-90 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              )}
              {step === 5 ? "Save and go to dashboard" : "Continue"}
              {!loading && <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

// ─── Step 1: Schema sample ────────────────────────────────────────────────────

function StepSchemaSample({
  collections,
  selected,
  onChange,
  loading,
}: {
  collections: SampleResponseType["collections"];
  selected: string[];
  onChange: (names: string[]) => void;
  loading: boolean;
}) {
  function toggle(name: string) {
    if (selected.includes(name)) onChange(selected.filter((n) => n !== name));
    else onChange([...selected, name]);
  }

  return (
    <section aria-labelledby="step1-heading">
      <FlowHeader
        eyebrow="Step 1 of 5"
        title="Schema sample"
        description="We sampled your top collections. Toggle to include or exclude from the analysis. Pick at least one."
      />

      <ul className="mt-6 space-y-2">
        {loading && collections.length === 0 &&
          Array.from({ length: 3 }).map((_, i) => (
            <li
              key={i}
              className="h-16 animate-pulse rounded-[10px] bg-argus-bg-sunken"
            />
          ))}
        {collections.map((c, i) => {
          const isOn = selected.includes(c.name);
          return (
            <motion.li
              key={c.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
            >
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-[10px] border px-4 py-3 transition-colors duration-150",
                  isOn
                    ? "border-argus-accent/40 bg-argus-accent/[0.04]"
                    : "border-argus-border bg-argus-bg-elevated hover:border-argus-border-strong",
                )}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(c.name)}
                  className="h-4 w-4 flex-shrink-0 rounded-[3px] border-argus-border accent-[color:var(--argus-accent)]"
                />
                <Database
                  className="h-4 w-4 flex-shrink-0 text-argus-text-muted"
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-argus-text truncate">
                    {c.name}
                  </p>
                  <p className="text-xs text-argus-text-muted truncate">
                    {c.sample_fields.slice(0, 4).join(", ")}
                    {c.sample_fields.length > 4 ? "…" : ""}
                  </p>
                </div>
                <span className="flex-shrink-0 font-mono text-xs tabular-nums text-argus-text-subtle">
                  {c.doc_count.toLocaleString()} docs
                </span>
              </label>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

// ─── Step 2: Insight selection ────────────────────────────────────────────────

function StepInsightSelection({
  selected,
  onChange,
}: {
  selected: ModuleKey[];
  onChange: (m: ModuleKey[]) => void;
}) {
  return (
    <section aria-labelledby="step2-heading">
      <FlowHeader
        eyebrow="Step 2 of 5"
        title="Insight modules"
        description="Pick the analysis modules for your dashboard. The planner proposes defaults — toggle to override."
      />

      <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m, i) => {
          const isOn = selected.includes(m.key);
          return (
            <motion.button
              key={m.key}
              type="button"
              onClick={() =>
                onChange(
                  isOn
                    ? selected.filter((x) => x !== m.key)
                    : [...selected, m.key],
                )
              }
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.06 }}
              className={cn(
                "group relative rounded-[10px] border px-4 py-4 text-left transition-colors duration-150 active:scale-[0.96]",
                isOn
                  ? "border-argus-accent/40 bg-argus-accent/[0.04]"
                  : "border-argus-border bg-argus-bg-elevated hover:border-argus-border-strong",
              )}
              aria-pressed={isOn}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-heading text-sm font-semibold text-argus-text">
                  {m.label}
                </span>
                <span
                  className={cn(
                    "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[3px] border transition-colors duration-150",
                    isOn
                      ? "border-argus-accent bg-argus-accent"
                      : "border-argus-border bg-transparent",
                  )}
                  aria-hidden
                >
                  {isOn && <Check className="h-2.5 w-2.5 text-argus-primary-fg" />}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-argus-text-muted">
                {m.description}
              </p>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

// ─── Step 3: Plan preview ─────────────────────────────────────────────────────

function StepPlanPreview({ plan }: { plan: PlanResponseType["plan"] }) {
  return (
    <section aria-labelledby="step3-heading">
      <FlowHeader
        eyebrow="Step 3 of 5"
        title="Plan preview"
        description="The planner generated these MQL pipelines. Review, then press Continue to render the cards. Estimated total: 2–3 min."
      />

      <div className="mt-6 space-y-2">
        {plan.length === 0 && (
          <div className="rounded-[10px] border border-argus-border bg-argus-bg-sunken px-5 py-4 text-sm text-argus-text-muted">
            No plan generated yet.
          </div>
        )}
        {plan.map((item, i) => (
          <motion.details
            key={i}
            open={i === 0}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.06 }}
            className="overflow-hidden rounded-[10px] border border-argus-border bg-argus-bg-elevated"
          >
            <summary className="flex cursor-pointer select-none items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-argus-bg-sunken/50">
              <span className="font-mono text-xs text-argus-text-subtle">
                #{i + 1}
              </span>
              <span className="font-medium capitalize text-argus-text">
                {item.module}
              </span>
              <span className="font-mono text-xs text-argus-text-subtle">
                {item.collection}
              </span>
              {item.estimated_runtime_s != null && (
                <span className="ml-auto font-mono text-xs tabular-nums text-argus-text-subtle">
                  ~{item.estimated_runtime_s}s
                </span>
              )}
            </summary>
            <div className="border-t border-argus-border px-4 py-3">
              <pre className="overflow-x-auto rounded-[6px] bg-argus-bg-sunken p-3 font-mono text-xs leading-relaxed text-argus-text">
                {JSON.stringify(item.mql_pipeline, null, 2)}
              </pre>
            </div>
          </motion.details>
        ))}
      </div>
    </section>
  );
}

// ─── Step 4: Render ───────────────────────────────────────────────────────────

function StepRender({
  cards,
  loading,
  tickerLines,
}: {
  cards: CardDescriptorType[];
  loading: boolean;
  tickerLines: string[];
}) {
  const simulatedLines = useSimulatedTicker(loading && cards.length === 0);

  // Show simulated lines until real lines arrive
  const displayLines =
    tickerLines.length > 0 ? tickerLines : simulatedLines;

  return (
    <section aria-labelledby="step4-heading">
      <FlowHeader
        eyebrow="Step 4 of 5"
        title="Rendering cards"
        description={
          loading
            ? "The agent is generating your insight cards. This takes 2–3 minutes."
            : `${cards.length} card${cards.length !== 1 ? "s" : ""} ready. Continue to customize the layout.`
        }
      />

      {/* Ticker — shown while loading */}
      <AnimatePresence initial={false}>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-6"
          >
            <AgentTicker lines={displayLines} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards grid */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {cards.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, delay: i * 0.08 }}
            className="min-h-[200px]"
          >
            <CardRenderer descriptor={c} />
          </motion.div>
        ))}
        {loading && (
          <Card>
            <div className="flex h-full min-h-[120px] items-center justify-center text-argus-text-muted">
              <Loader2
                className="h-5 w-5 animate-spin text-argus-accent"
                aria-hidden
              />
            </div>
          </Card>
        )}
      </div>
    </section>
  );
}

// ─── Step 5: Customize ────────────────────────────────────────────────────────

function StepCustomize({ cards }: { cards: CardDescriptorType[] }) {
  const [liked, setLiked] = useState<Record<number, boolean | null>>({});

  function toggleLike(i: number, val: boolean) {
    setLiked((prev) => ({ ...prev, [i]: prev[i] === val ? null : val }));
  }

  return (
    <section aria-labelledby="step5-heading">
      <FlowHeader
        eyebrow="Step 5 of 5"
        title="Customize"
        description="Rate the cards below — we'll surface your favorites first. On the dashboard you can drag, resize, and pin any card."
      />

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {cards.map((c, i) => {
          const likeState = liked[i];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.07 }}
              className="flex flex-col gap-2"
            >
              <div className="min-h-[200px]">
                <CardRenderer descriptor={c} />
              </div>
              {/* Thumbs row */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleLike(i, true)}
                  aria-label="Keep this card"
                  aria-pressed={likeState === true}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-[6px] border transition-colors duration-150 active:scale-[0.96]",
                    likeState === true
                      ? "border-argus-accent bg-argus-accent/10 text-argus-accent"
                      : "border-argus-border text-argus-text-subtle hover:border-argus-border-strong hover:text-argus-text",
                  )}
                >
                  <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => toggleLike(i, false)}
                  aria-label="Skip this card"
                  aria-pressed={likeState === false}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-[6px] border transition-colors duration-150 active:scale-[0.96]",
                    likeState === false
                      ? "border-argus-danger bg-argus-danger-bg/50 text-argus-danger"
                      : "border-argus-border text-argus-text-subtle hover:border-argus-border-strong hover:text-argus-text",
                  )}
                >
                  <ThumbsDown className="h-3.5 w-3.5" aria-hidden />
                </button>
                <span className="text-[11px] text-argus-text-subtle">
                  {likeState === true
                    ? "Keeping"
                    : likeState === false
                    ? "Will skip"
                    : "Rate this card"}
                </span>
              </div>
            </motion.div>
          );
        })}

        {cards.length === 0 && (
          <div className="col-span-full rounded-[12px] border border-dashed border-argus-border bg-argus-bg-elevated px-8 py-12 text-center">
            <p className="text-sm text-argus-text-muted">
              No cards yet — you can add them from the dashboard.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
