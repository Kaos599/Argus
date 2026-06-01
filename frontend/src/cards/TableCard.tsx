"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn, downloadCSV, formatStatValue } from "@/lib/utils";
import type { TableCardPropsType } from "@/types/api";

type SortDir = "asc" | "desc" | null;

function formatCell(
  v: string | number | null | undefined,
  fmt: TableCardPropsType["columns"][number]["format"],
): string {
  if (v === null || v === undefined) return "—";
  if (fmt === "usd") {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? `$${n.toLocaleString("en-US")}` : String(v);
  }
  if (fmt === "percent") {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? `${n.toFixed(1)}%` : String(v);
  }
  if (fmt === "number") {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? formatStatValue(n, "count") : String(v);
  }
  if (fmt === "date" || fmt === "datetime") {
    const d = new Date(String(v));
    if (Number.isNaN(d.getTime())) return String(v);
    return fmt === "date"
      ? d.toLocaleDateString("en-US")
      : d.toLocaleString("en-US");
  }
  return String(v);
}

export function TableCard({
  title,
  columns,
  rows,
  pageSize = 25,
  enableSearch = true,
  enableExport = true,
}: TableCardPropsType) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q)),
    );
  }, [rows, query]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const an = typeof av === "number" ? av : Number(av);
      const bn = typeof bv === "number" ? bv : Number(bv);
      const aValid = Number.isFinite(an);
      const bValid = Number.isFinite(bn);
      let cmp: number;
      if (aValid && bValid) cmp = an - bn;
      else cmp = String(av ?? "").localeCompare(String(bv ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  function toggleSort(key: string) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
      return;
    }
    if (sortDir === "asc") setSortDir("desc");
    else if (sortDir === "desc") {
      setSortKey(null);
      setSortDir(null);
    } else setSortDir("asc");
  }

  return (
    <Card
      title={title}
      toolbar={
        <>
          {enableSearch && (
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-argus-text-subtle"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Search…"
                aria-label={`Search ${title ?? "table"}`}
                className="h-8 w-40 rounded-sm border border-argus-border bg-argus-bg pl-7 pr-2 text-xs text-argus-text placeholder:text-argus-text-subtle focus:border-argus-primary focus:outline-none"
              />
            </div>
          )}
          {enableExport && (
            <button
              type="button"
              onClick={() =>
                downloadCSV(
                  `${(title ?? "table").toLowerCase().replace(/\s+/g, "-")}.csv`,
                  sorted,
                )
              }
              className="inline-flex h-8 items-center gap-1 rounded-sm border border-argus-border bg-argus-bg px-2 text-xs text-argus-text-muted hover:bg-argus-bg-elevated"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              CSV
            </button>
          )}
        </>
      }
    >
      <div className="-mx-4 -my-4 overflow-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-argus-border">
              {columns.map((c) => {
                const isSorted = sortKey === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    className={cn(
                      "whitespace-nowrap px-3 py-2 text-xs font-medium text-argus-text-muted",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      c.sortable && "cursor-pointer select-none hover:text-argus-text",
                    )}
                    onClick={() => c.sortable && toggleSort(c.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      {c.sortable &&
                        (isSorted ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="h-3 w-3" aria-hidden />
                          ) : (
                            <ArrowDown className="h-3 w-3" aria-hidden />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-30" aria-hidden />
                        ))}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, ri) => (
              <tr
                key={ri}
                className="border-b border-argus-border last:border-b-0 hover:bg-argus-bg-sunken"
              >
                {columns.map((c) => {
                  const v = row[c.key];
                  return (
                    <td
                      key={c.key}
                      className={cn(
                        "whitespace-nowrap px-3 py-2 font-mono text-xs tabular-nums text-argus-text",
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center",
                      )}
                    >
                      {formatCell(v, c.format)}
                    </td>
                  );
                })}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-6 text-center text-argus-text-subtle"
                >
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-xs text-argus-text-muted">
          <span>
            Page {safePage + 1} of {totalPages} · {sorted.length} rows
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              className="rounded-sm border border-argus-border bg-argus-bg px-2 py-1 hover:bg-argus-bg-elevated disabled:opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage(safePage + 1)}
              className="rounded-sm border border-argus-border bg-argus-bg px-2 py-1 hover:bg-argus-bg-elevated disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
