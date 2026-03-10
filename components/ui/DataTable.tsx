"use client";
import { useRef, useState, useMemo, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

export interface ColDef<T = Record<string, unknown>> {
  key:     string;
  label:   string;
  right?:  boolean;
  bold?:   boolean;
  width?:  number;
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
  cols:        ColDef<T>[];
  rows:        T[];
  onRowClick?: (row: T) => void;
  colorCell?:  (key: string, value: unknown) => string | undefined;
  pageSize?:   number;
  virtualize?: boolean;
  className?:  string;
}

const PAGE_SIZE_DEFAULT    = 50;
const VIRTUALIZE_THRESHOLD = 100;

export function DataTable<T extends Record<string, unknown>>({
  cols,
  rows,
  onRowClick,
  colorCell,
  pageSize = PAGE_SIZE_DEFAULT,
  virtualize,
  className,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const shouldVirtualize = virtualize ?? rows.length > VIRTUALIZE_THRESHOLD;

  // ── FIX (HIGH): Reset to page 0 whenever the rows array changes.
  //    Previously, if a filter reduced row count from e.g. 200 → 5, the
  //    page state could remain at a value larger than the new totalPages,
  //    causing pagedRows to be an empty slice with no data shown.
  useEffect(() => {
    setPage(0);
  }, [rows]);

  const pagedRows = useMemo(
    () =>
      shouldVirtualize
        ? rows
        : rows.slice(page * pageSize, (page + 1) * pageSize),
    [rows, page, pageSize, shouldVirtualize],
  );

  const totalPages = Math.ceil(rows.length / pageSize);

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count:            shouldVirtualize ? rows.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize:     () => 42,
    overscan:         10,
  });

  const displayRows = shouldVirtualize
    ? virtualizer.getVirtualItems().map(vi => ({ row: rows[vi.index]!, vi }))
    : pagedRows.map((row, i) => ({
        row,
        vi: { index: i, start: 0, size: 0 } as any,
      }));

  return (
    <div className={cn("w-full", className)}>
      <div
        ref={parentRef}
        className={cn("overflow-auto", shouldVirtualize && "max-h-[480px]")}
      >
        <table className="w-full border-collapse text-xs font-sans">
          <thead className="sticky top-0 z-10 bg-theme-surface">
            <tr className="border-b-2 border-theme-border">
              {cols.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    "px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-theme-dim whitespace-nowrap",
                    col.right ? "text-right" : "text-left",
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            style={
              shouldVirtualize
                ? { height: virtualizer.getTotalSize(), position: "relative" }
                : undefined
            }
          >
            {displayRows.map(({ row, vi }, i) => (
              <tr
                key={shouldVirtualize ? vi.index : i}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-theme-border/20 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-theme-blue/5",
                  !shouldVirtualize && i % 2 === 1 && "bg-theme-blue/[0.02]",
                )}
                style={
                  shouldVirtualize
                    ? { position: "absolute", top: vi.start, left: 0, right: 0 }
                    : undefined
                }
              >
                {cols.map(col => {
                  const value = row[col.key];
                  const color = colorCell?.(col.key, value);
                  return (
                    <td
                      key={col.key}
                      className={cn(
                        "px-3 py-2 whitespace-nowrap",
                        col.right ? "text-right" : "text-left",
                        col.bold ? "font-bold text-theme-text" : "text-theme-dim",
                      )}
                      style={color ? { color } : undefined}
                    >
                      {col.render ? col.render(value, row) : (value as React.ReactNode)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination — only when not virtualizing */}
      {!shouldVirtualize && totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-theme-border text-xs text-theme-dim">
          <span>
            {rows.length} rows · page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2 py-1 rounded border border-theme-border disabled:opacity-40 hover:border-theme-blue"
            >
              ‹ Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-2 py-1 rounded border border-theme-border disabled:opacity-40 hover:border-theme-blue"
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
