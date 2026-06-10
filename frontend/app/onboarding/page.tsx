"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Database, Loader2, Sparkles } from "lucide-react";
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

const MODULES = [
  { key: "funnel", label: "Funnel" },
  { key: "cohort", label: "Cohort" },
  { key: "rfm", label: "RFM" },
  { key: "attribution", label: "Attribution" },
  { key: "anomaly", label: "Anomaly" },
] as const;
type ModuleKey = (typeof MODULES)[number]["key"];

const STEPS = [
  "Schema sample",
  "Insight selection",
  "Plan preview",
  "Render",
  "Customize",
] as const;

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
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-8 w-48 animate-pulse rounded bg-argus-bg-sunken" />
        <div className="mt-6 h-64 animate-pulse rounded-lg bg-argus-bg-sunken" />
      </main>
    </div>
  );
}

function OnboardingFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const tokenFromQuery = params.get("token");
  const token = tokenFromQuery ?? (typeof window !== "undefined" ? window.localStorage.getItem("argus-session-token") : null);

  const [step, setStep] = useState(1);
  const [collections, setCollections] = useState<SampleResponseType["collections"]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<ModuleKey[]>(["funnel", "anomaly"]);
  const [planId, setPlanId] = useState<string | null>(null);
  const [planData, setPlanData] = useState<PlanResponseType["plan"]>([]);
  const [cards, setCards] = useState<CardDescriptorType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const events: RenderEventType[] = [];
        for await (const ev of renderStream({
          session_token: token ?? "",
          plan_id: planId,
        })) {
          events.push(ev);
          if (ev.event === "card") {
            setCards((prev) => [...prev, ev.data]);
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

  if (!token) {
    return (
      <>
        <TopBar />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="font-heading text-2xl font-bold">No session token</h1>
          <p className="mt-2 text-argus-text-muted">
            Start at the <Link href="/connect" className="text-argus-accent hover:underline">connect page</Link>.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <main id="main-content" className="mx-auto max-w-screen-lg px-4 py-8 md:py-12">
        <Stepper currentStep={step} />

        <div className="mt-8">
          {step === 1 && (
            <StepSchemaSample
              collections={collections}
              selected={selectedCollections}
              onChange={setSelectedCollections}
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
            <StepRender cards={cards} loading={loading} />
          )}
          {step === 5 && (
            <StepCustomize cards={cards} />
          )}

          {error && (
            <div className="mt-6">
              <ErrorCard
                title="Something went wrong"
                message={error}
                isRetryable
                isFullPage={false}
                isReadOnlyViolation={false}
                guidance="Try going back a step and adjusting your selections."
              />
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="inline-flex h-11 items-center gap-1 rounded-[10px] border border-argus-border bg-argus-bg-elevated px-4 text-sm text-argus-text transition-all hover:border-argus-text-muted disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={loading || (step === 1 && selectedCollections.length === 0) || (step === 2 && selectedModules.length === 0)}
              className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-argus-accent px-5 text-sm font-semibold text-black transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {step === 5 ? "Save and go to dashboard" : "Continue"}
              {!loading && <ChevronRight className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

/* ============== Stepper ============== */

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <ol className="flex items-center gap-3" aria-label="Onboarding progress">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const active = n === currentStep;
        const done = n < currentStep;
        return (
          <li key={label} className="flex flex-1 items-center gap-3">
            <span
              className={cn(
                "inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[8px] text-[11px] font-bold transition-all",
                done && "bg-argus-accent text-black",
                active && "border-2 border-argus-accent bg-argus-accent/10 text-argus-accent",
                !done && !active && "border border-argus-border bg-argus-bg text-argus-text-subtle",
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : n}
            </span>
            <span
              className={cn(
                "text-xs",
                active ? "font-semibold text-argus-text" : "text-argus-text-muted",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="mx-1 h-px flex-1 bg-argus-border" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ============== Step 1: Schema sample ============== */

function StepSchemaSample({
  collections,
  selected,
  onChange,
}: {
  collections: SampleResponseType["collections"];
  selected: string[];
  onChange: (names: string[]) => void;
}) {
  function toggle(name: string) {
    if (selected.includes(name)) onChange(selected.filter((n) => n !== name));
    else onChange([...selected, name]);
  }
  return (
    <section>
      <h2 className="font-heading text-2xl font-bold">Schema sample</h2>
      <p className="mt-1 text-argus-text-muted">
        We sampled the top 5 collections. Toggle to include or exclude.
      </p>
      <ul className="mt-6 space-y-2">
        {collections.map((c) => {
          const isOn = selected.includes(c.name);
          return (
            <li key={c.name}>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-[12px] border p-4 transition-all",
                  isOn
                    ? "border-argus-accent/30 bg-argus-accent/[0.03]"
                    : "border-argus-border bg-argus-bg-elevated hover:border-argus-border-strong",
                )}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(c.name)}
                  className="h-4 w-4 rounded-[4px] border-argus-border text-argus-accent focus:ring-argus-accent/20"
                />
                <Database className="h-4 w-4 text-argus-text-muted" aria-hidden />
                <div className="flex-1">
                  <p className="font-mono text-sm">{c.name}</p>
                  <p className="text-xs text-argus-text-muted">
                    {c.doc_count.toLocaleString()} docs ·{" "}
                    {c.sample_fields.slice(0, 4).join(", ")}
                    {c.sample_fields.length > 4 ? "…" : ""}
                  </p>
                </div>
                <span className="font-mono text-xs text-argus-text-subtle">
                  {c.doc_count.toLocaleString()}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ============== Step 2: Insight selection ============== */

function StepInsightSelection({
  selected,
  onChange,
}: {
  selected: ModuleKey[];
  onChange: (m: ModuleKey[]) => void;
}) {
  return (
    <section>
      <h2 className="font-heading text-2xl font-bold">Insight modules</h2>
      <p className="mt-1 text-argus-text-muted">
        Pick the modules you want on the dashboard. The planner will propose a
        default — toggle to override.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => {
          const isOn = selected.includes(m.key);
          return (
            <button
              key={m.key}
              type="button"
              onClick={() =>
                onChange(
                  isOn ? selected.filter((x) => x !== m.key) : [...selected, m.key],
                )
              }
              className={cn(
                "rounded-[12px] border p-5 text-left transition-all",
                isOn
                  ? "border-argus-accent/30 bg-argus-accent/[0.03]"
                  : "border-argus-border bg-argus-bg-elevated hover:border-argus-border-strong",
              )}
              aria-pressed={isOn}
            >
              <div className="flex items-center justify-between">
                <span className="font-heading font-medium">{m.label}</span>
                {isOn && (
                  <span className="text-xs text-argus-accent">Selected</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ============== Step 3: Plan preview ============== */

function StepPlanPreview({ plan }: { plan: PlanResponseType["plan"] }) {
  return (
    <section>
      <h2 className="font-heading text-2xl font-bold">Plan preview</h2>
      <p className="mt-1 text-argus-text-muted">
        The planner generated the following pipelines for your insight modules. Press Continue to
        render the cards.
      </p>
      <div className="mt-6 space-y-3">
        {plan.length === 0 && (
          <div className="rounded-[12px] border border-argus-border bg-argus-bg-sunken p-5 text-sm text-argus-text-muted">
            No plan generated.
          </div>
        )}
        {plan.map((item, i) => (
          <details
            key={i}
            open={i === 0}
            className="rounded-[12px] border border-argus-border bg-argus-bg-elevated overflow-hidden"
          >
            <summary className="flex cursor-pointer items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors hover:bg-argus-bg-sunken/50">
              <span className="text-argus-text-muted">#{i + 1}</span>
              <span className="capitalize">{item.module}</span>
              <span className="font-mono text-xs text-argus-text-subtle">
                {item.collection}
              </span>
              {item.estimated_runtime_s != null && (
                <span className="ml-auto text-xs text-argus-text-muted">
                  ~{item.estimated_runtime_s}s
                </span>
              )}
            </summary>
            <div className="border-t border-argus-border px-5 py-4">
              <pre className="overflow-x-auto rounded-[8px] bg-argus-bg-sunken p-4 font-mono text-xs text-argus-text">
                {JSON.stringify(item.mql_pipeline, null, 2)}
              </pre>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ============== Step 4: Render ============== */

function StepRender({ cards, loading }: { cards: CardDescriptorType[]; loading: boolean }) {
  return (
    <section>
      <h2 className="font-heading text-2xl font-bold">Render</h2>
      <p className="mt-1 text-argus-text-muted">
        {loading
          ? "Streaming cards from the planner…"
          : `${cards.length} cards ready. Continue to customize the layout.`}
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {cards.map((c, i) => (
          <div key={i} className="min-h-[200px]">
            <CardRenderer descriptor={c} />
          </div>
        ))}
        {loading && (
          <Card>
            <div className="flex h-full items-center justify-center text-argus-text-muted">
              <Loader2 className="h-5 w-5 animate-spin text-argus-accent" aria-hidden />
            </div>
          </Card>
        )}
      </div>
    </section>
  );
}

/* ============== Step 5: Customize ============== */

function StepCustomize({ cards }: { cards: CardDescriptorType[] }) {
  return (
    <section>
      <h2 className="font-heading text-2xl font-bold">Customize</h2>
      <p className="mt-1 text-argus-text-muted">
        You can drag, drop, and resize on the dashboard next. Press Save to
        continue.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {cards.map((c, i) => (
          <div key={i} className="min-h-[200px]">
            <CardRenderer descriptor={c} />
          </div>
        ))}
        {cards.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-[16px] border border-dashed border-argus-border bg-argus-bg-elevated p-12 text-center">
            <Sparkles className="h-6 w-6 text-argus-accent" aria-hidden />
            <p className="mt-2 text-sm text-argus-text-muted">No cards yet — you can add them from the dashboard.</p>
          </div>
        )}
      </div>
    </section>
  );
}
