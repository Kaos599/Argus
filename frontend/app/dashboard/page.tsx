"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { GripVertical } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { CardRenderer } from "@/cards";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardEmpty } from "@/components/dashboard/DashboardEmpty";
import { DashboardSkeletons } from "@/components/dashboard/DashboardSkeletons";
import { AddCardPanel } from "@/components/dashboard/AddCardPanel";
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

// Grid constants — identical to original (data logic untouched)
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480 };
const COLS = { lg: 12, md: 12, sm: 6, xs: 4 };
const ROW_HEIGHT = 80;

export default function DashboardPage() {
  const { token } = useSessionToken();
  const [dashboard, setDashboard] = useState<DashboardResponseType | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  // Track whether this is the first render so stagger only fires once
  const hasAnimated = useRef(false);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getDashboard(token)
      .then(setDashboard)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [token]);

  // ── 30-second auto-refresh (PRESERVED) ────────────────────────────────────
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

  // ── Layout persistence (PRESERVED) ────────────────────────────────────────
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

  // ── Manual refresh ─────────────────────────────────────────────────────────
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

  // ── Add card ───────────────────────────────────────────────────────────────
  async function handleAddCard(module: AddCardRequestType["module"]) {
    if (!token) return;
    try {
      const res = await addCard({ session_token: token, module });
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

  // ── No session ─────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <>
        <TopBar />
        <main
          id="main-content"
          className="mx-auto max-w-md px-4 py-20 text-center"
        >
          <h1
            className="font-heading text-2xl font-semibold text-argus-text"
            style={{ fontFamily: "var(--argus-font-heading)" }}
          >
            No session active
          </h1>
          <p className="mt-2 text-sm text-argus-text-muted">
            Start by connecting a MongoDB database.
          </p>
          <Link
            href="/connect"
            className="mt-6 inline-flex h-10 items-center rounded-[var(--argus-radius-md)] bg-argus-accent px-5 text-sm font-semibold text-argus-bg transition-opacity duration-150 hover:opacity-90 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-argus-accent focus-visible:ring-offset-2"
          >
            Connect a database
          </Link>
        </main>
      </>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <TopBar />
        <main id="main-content" className="mx-auto max-w-screen-2xl px-4 py-6">
          <DashboardSkeletons />
        </main>
      </>
    );
  }

  // ── No dashboard data ──────────────────────────────────────────────────────
  if (!dashboard) {
    return (
      <>
        <TopBar />
        <main id="main-content" className="mx-auto max-w-screen-2xl px-4 py-6">
          <DashboardEmpty />
        </main>
      </>
    );
  }

  // Set animation flag after first load
  const shouldStagger = !hasAnimated.current;
  hasAnimated.current = true;

  // ── Main dashboard ─────────────────────────────────────────────────────────
  return (
    <>
      <TopBar />
      <main id="main-content" className="mx-auto max-w-screen-2xl px-4 py-6">
        <DashboardHeader
          cardCount={dashboard.cards.length}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onToggleAddCard={() => setShowAddCard((v) => !v)}
          showAddCard={showAddCard}
        />

        {showAddCard && <AddCardPanel onAdd={handleAddCard} />}

        {dashboard.cards.length === 0 ? (
          <DashboardEmpty />
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
              <div
                key={`card-${i}`}
                className="group/grid-item"
                style={
                  shouldStagger
                    ? {
                        opacity: 0,
                        animation: `fade-in-up 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 50}ms forwards`,
                      }
                    : undefined
                }
              >
                <DraggableCardWrapper descriptor={descriptor} />
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </main>
    </>
  );
}

// ── Draggable wrapper ────────────────────────────────────────────────────────
function DraggableCardWrapper({ descriptor }: { descriptor: CardDescriptorType }) {
  return (
    <div className="relative h-full w-full">
      {/* Drag handle — thin strip at top, visible on group-hover */}
      <div
        className={cn(
          "card-drag-handle",
          "absolute inset-x-0 top-0 z-10 flex h-5 cursor-move items-center justify-center",
          "rounded-t-[var(--argus-radius-lg)]",
          "opacity-0 transition-opacity duration-150",
          "group-hover/grid-item:opacity-100",
        )}
        aria-label="Drag to reorder card"
        role="button"
        tabIndex={0}
        title="Drag to reorder"
      >
        <GripVertical
          className="h-3.5 w-3.5 text-argus-text-subtle"
          aria-hidden
        />
      </div>

      {/* Card content — full height */}
      <div className="h-full w-full pt-5">
        <CardRenderer descriptor={descriptor} />
      </div>
    </div>
  );
}

// ── Layout helpers (PRESERVED, unchanged logic) ────────────────────────────
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
