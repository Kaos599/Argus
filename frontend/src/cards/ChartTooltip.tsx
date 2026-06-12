"use client";

type ValueType = number | string | Array<number | string>;
type NameType = string | number;

interface PayloadEntry {
  value?: ValueType;
  name?: NameType;
  color?: string;
  dataKey?: string | number;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: PayloadEntry[];
  label?: string | number;
  /** Optional value formatter — receives the raw value and series name */
  valueFormatter?: (value: ValueType | undefined, name: NameType | undefined) => string;
}

/**
 * Custom Recharts tooltip — white elevated panel, layered shadow.
 *
 * Usage:
 *   import { tooltipCursor } from "./chartTheme";
 *   <Tooltip content={<ChartTooltip />} cursor={tooltipCursor} />
 */
export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="pointer-events-none z-50 rounded-[10px] border border-argus-border bg-argus-bg-elevated px-3 py-2.5"
      style={{
        boxShadow:
          "0 4px 6px -1px rgba(0,0,0,0.07), 0 10px 30px -4px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)",
      }}
    >
      {label !== undefined && (
        <p className="mb-2 text-[11px] text-argus-text-muted">{label}</p>
      )}
      <div className="flex flex-col gap-1.5">
        {payload.map((entry, i) => {
          const raw = entry.value;
          const name = entry.name ?? "";
          const displayValue = valueFormatter
            ? valueFormatter(raw, name)
            : raw != null
              ? (typeof raw === "number"
                  ? raw.toLocaleString("en-US")
                  : String(raw))
              : "—";

          return (
            <div key={i} className="flex items-center gap-2">
              {/* Color swatch */}
              <span
                className="inline-block h-2 w-2 flex-shrink-0 rounded-[2px]"
                style={{ background: entry.color ?? "var(--argus-chart-1)" }}
                aria-hidden
              />
              {/* Series name */}
              <span className="text-xs text-argus-text-muted">{String(name)}</span>
              {/* Value — right-aligned */}
              <span className="ml-auto pl-4 font-mono text-xs tabular-nums text-argus-text">
                {displayValue}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
