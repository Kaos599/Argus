"use client";

import { CardSkeleton } from "@/components/ui/Card";

/**
 * Staggered skeleton shimmer grid shown while the dashboard loads.
 * Mimics the approximate shape of a real dashboard layout.
 */
export function DashboardSkeletons() {
  // Widths approximate the typical card grid — 2 wide + 1 narrow, then 3 equal
  const skeletons: Array<{ colSpan: string; height: string; delay: string }> = [
    { colSpan: "col-span-12 md:col-span-8", height: "h-64", delay: "0ms" },
    { colSpan: "col-span-12 md:col-span-4", height: "h-64", delay: "50ms" },
    { colSpan: "col-span-12 md:col-span-4", height: "h-48", delay: "100ms" },
    { colSpan: "col-span-12 md:col-span-4", height: "h-48", delay: "150ms" },
    { colSpan: "col-span-12 md:col-span-4", height: "h-48", delay: "200ms" },
  ];

  return (
    <div
      className="grid grid-cols-12 gap-4"
      role="status"
      aria-label="Loading dashboard cards"
      aria-busy
    >
      {skeletons.map(({ colSpan, height, delay }, i) => (
        <div
          key={i}
          className={`${colSpan} ${height}`}
          style={{
            opacity: 0,
            animation: `fade-in-up 0.4s cubic-bezier(0.16,1,0.3,1) ${delay} forwards`,
          }}
        >
          <CardSkeleton className="h-full" />
        </div>
      ))}
    </div>
  );
}
