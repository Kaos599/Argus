"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/ui/Card";
import { CardRenderer } from "@/cards";
import {
  addCard,
  getDashboard,
  refresh,
  saveLayout,
} from "@/lib/api";
import type {
  AddCardRequestType,
  CardDescriptorType,
  DashboardResponseType,
} from "@/types/api";
import { useSessionToken } from "@/lib/session";
import { cn } from "@/lib/utils";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = dynamic(
  () =>
    import("react-grid-layout/legacy").then((m) =>
      m.WidthProvider(m.Responsive),
    ),
  { ssr: false },
) as unknown as React.ComponentType<{
  className?: string;
  children?: React.ReactNode;
  layouts: unknown;
  breakpoints: { lg: number; md: number; sm: number; xs: number };
  cols: { lg: number; md: number; sm: number; xs: number };
  rowHeight: number;
  margin: [number, number];
  containerPadding?: [number, number];
  draggableHandle?: string;
  onLayoutChange: (layout: unknown, allLayouts: unknown) => void;
  isDraggable?: boolean;
  isResizable?: boolean;
  compactType?: "vertical" | "horizontal" | null;
}>;

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480 };
const COLS = { lg: 12, md: 12, sm: 6, xs: 4 };
const ROW_HEIGHT = 80;

export default function DashboardPage() {
  const { token } = useSessionToken();
  const [dashboard, setDashboard] = useState<DashboardResponseType | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getDashboard(token)
      .then(setDashboard)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(async () => {
      try {
        await refresh({ session_token: token });
        const fresh = await getDashboard(token);
        setDashboard(fresh);
      } catch {
        // swallow errors; next interval will retry
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  async function handleLayoutChange(_currentLayout: unknown, allLayouts: unknown) {
    if (!token || !dashboard) return;
    const layouts = allLayouts as DashboardResponseType["layout"];
    setDashboard((d) => (d ? { ...d, layout: layouts } : d));
    try {
      await saveLayout({
        session_token: token,
        layout: layouts,
      });
    } catch {
      // swallow; we'll retry on next change
    }
  }

  async function handleRefresh() {
    if (!token) return;
    setRefreshing(true);
    try {
      await refresh({ session_token: token });
      const fresh = await getDashboard(token);
      setDashboard(fresh);
    } catch {
      // If refresh or re-fetch fails, the existing dashboard stays intact.
    } finally {
      setRefreshing(false);
    }
  }

  async function handleAddCard(module: AddCardRequestType["module"]) {
    if (!token) return;
    try {
      const res = await addCard({
        session_token: token,
        module,
      });
      setDashboard((d) =>
        d
          ? {
              ...d,
              cards: [...d.cards, res.card],
              layout: appendLayoutItem(d.layout, res.card_id),
            }
          : d,
      );
    } finally {
      setShowAddCard(false);
    }
  }

  if (!token) {
    return (
      <>
        <TopBar />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="font-heading text-2xl font-bold">No session</h1>
          <p className="mt-2 text-argus-text-muted">
            Start at the <Link href="/connect" className="text-argus-accent hover:underline">connect page</Link>.
          </p>
        </main>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <TopBar />
        <main className="mx-auto max-w-screen-2xl px-4 py-8">
          <p className="text-argus-text-muted">Loading dashboard…</p>
        </main>
      </>
    );
  }

  if (!dashboard) {
    return (
      <>
        <TopBar />
        <main className="mx-auto max-w-screen-2xl px-4 py-8">
          <p className="text-argus-text-muted">No dashboard yet.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <main id="main-content" className="mx-auto max-w-screen-2xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
            <p className="mt-0.5 text-sm text-argus-text-muted">
              {dashboard.cards.length} cards
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-argus-border bg-argus-bg-elevated px-4 text-sm text-argus-text transition-all hover:border-argus-text-muted disabled:opacity-50"
            >
              <RefreshCw
                className={cn("h-4 w-4", refreshing && "animate-spin")}
                aria-hidden
              />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => setShowAddCard((v) => !v)}
              className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-argus-accent px-4 text-sm font-semibold text-black transition-all hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add card
            </button>
          </div>
        </div>

        {showAddCard && (
          <Card className="mb-6" surface="elevated">
            <p className="text-sm font-medium">Add a card</p>
            <p className="text-xs text-argus-text-muted">
              Pick an insight module. The planner will generate a card.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["funnel", "cohort", "rfm", "attribution", "anomaly"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleAddCard(m)}
                  className="rounded-[8px] border border-argus-border bg-argus-bg px-3 py-1.5 text-xs capitalize text-argus-text transition-colors hover:border-argus-accent hover:text-argus-accent"
                >
                  {m}
                </button>
              ))}
            </div>
          </Card>
        )}

        {dashboard.cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-argus-border bg-argus-bg-elevated/50 p-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-argus-accent/10">
              <Plus className="h-5 w-5 text-argus-accent" aria-hidden />
            </div>
            <h2 className="mt-4 font-heading text-lg font-semibold">No cards yet</h2>
            <p className="mt-1 text-sm text-argus-text-muted">
              Add a card above, or go through onboarding to generate a starter set.
            </p>
            <Link
              href="/onboarding"
              className="mt-6 inline-flex h-10 items-center rounded-[10px] bg-argus-accent px-5 text-sm font-semibold text-black transition-all hover:scale-[1.02]"
            >
              Start onboarding
            </Link>
          </div>
        ) : (
          <ResponsiveGridLayout
            className="layout"
            layouts={dashboard.layout}
            breakpoints={BREAKPOINTS}
            cols={COLS}
            rowHeight={ROW_HEIGHT}
            margin={[16, 16]}
            containerPadding={[0, 0]}
            draggableHandle=".card-drag-handle"
            onLayoutChange={handleLayoutChange}
            isDraggable
            isResizable
            compactType="vertical"
          >
            {dashboard.cards.map((descriptor, i) => (
              <div key={`card-${i}`} className="group">
                <DraggableCardWrapper descriptor={descriptor} />
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </main>
    </>
  );
}

function DraggableCardWrapper({ descriptor }: { descriptor: CardDescriptorType }) {
  return (
    <div className="relative h-full w-full">
      <div
        className="card-drag-handle absolute inset-x-0 top-0 z-10 h-4 cursor-move rounded-t-[10px] opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background: "linear-gradient(180deg, var(--argus-accent) 0%, transparent 100%)",
          opacity: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.15"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0"; }}
        aria-label="Drag to reorder"
        role="button"
        tabIndex={0}
      />
      <div className="h-full w-full">
        <CardRenderer descriptor={descriptor} />
      </div>
    </div>
  );
}

function appendLayoutItem(
  layout: DashboardResponseType["layout"],
  id: string,
): DashboardResponseType["layout"] {
  const add = (arr: DashboardResponseType["layout"]["lg"]) => [
    ...arr,
    { i: id, x: 0, y: Infinity, w: 4, h: 4 },
  ];
  return {
    lg: add(layout.lg),
    md: layout.md.length ? add(layout.md) : layout.md,
    sm: layout.sm.length ? add(layout.sm) : layout.sm,
    xs: layout.xs.length ? add(layout.xs) : layout.xs,
  };
}
