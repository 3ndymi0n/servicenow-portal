"use client";
import { useState, useMemo } from "react";
import type { AnalyticsData } from "@/types";
import { Card, SectionTitle }  from "@/components/ui/Card";
import { Badge }               from "@/components/ui/Badge";
import { usePatterns }         from "@/hooks/analytics/usePatterns";
import type { PatternSignal, SignalSeverity } from "@/lib/analytics/patterns";

const SEV_COLOR: Record<SignalSeverity, string> = {
  high:   "#ef4444",
  medium: "#f59e0b",
  low:    "#3d6fd4",
};
const TYPE_LABELS: Record<string, string> = {
  velocity_surge:      "🚀 Velocity Surge",
  steady_climb:        "📈 Steady Climb",
  priority_escalation: "🔺 Priority Escalation",
  concentrated_spike:  "🎯 Concentrated Spike",
  keyword_surge:       "💬 Keyword Surge",
};

interface Props { data: AnalyticsData; months: string[] }

function Sparkline({ series, color }: { series: number[]; color: string }) {
  if (series.length < 2) return null;
  const max = Math.max(...series, 1);
  const W = 80, H = 30, pad = 2;
  const points = series
    .map((v, i) => {
      const x = pad + (i / (series.length - 1)) * (W - 2 * pad);
      const y = H - pad - (v / max) * (H - 2 * pad);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={W} height={H} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {series.map((v, i) => {
        const x = pad + (i / (series.length - 1)) * (W - 2 * pad);
        const y = H - pad - (v / max) * (H - 2 * pad);
        return i === series.length - 1 ? (
          <circle key={i} cx={x} cy={y} r={3} fill={color} />
        ) : null;
      })}
    </svg>
  );
}

function SignalCard({ sig }: { sig: PatternSignal }) {
  const color = SEV_COLOR[sig.severity];
  return (
    <div
      className="rounded-card bg-theme-card border p-4 animate-fade-in"
      style={{ borderColor: `${color}44` }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="text-[10px] text-theme-dim mb-0.5">
            {TYPE_LABELS[sig.type] ?? sig.type}
          </div>
          <div className="font-bold text-sm text-theme-text">{sig.label}</div>
        </div>
        <Badge color={color}>{sig.severity.toUpperCase()}</Badge>
      </div>
      <p className="text-xs text-theme-dim mb-3">{sig.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-[11px] text-theme-dim">
          {sig.slope !== 0 && (
            <span>
              Slope:{" "}
              <b className="text-theme-text">
                {sig.slope > 0 ? "+" : ""}{sig.slope}/mo
              </b>
            </span>
          )}
          <span>
            z = <b className="text-theme-text">{sig.zScore.toFixed(2)}</b>
          </span>
          <span>
            Confidence:{" "}
            <b style={{ color }}>{sig.confidence}%</b>
          </span>
        </div>
        <Sparkline series={sig.series} color={color} />
      </div>
    </div>
  );
}

type DimFilter = "all" | "Category" | "Resolver Group" | "Combined" | "Keyword";
type SevFilter = "all" | SignalSeverity;

export function PatternsTab({ data, months }: Props) {
  const [dimFilter, setDimFilter] = useState<DimFilter>("all");
  const [sevFilter, setSevFilter] = useState<SevFilter>("all");
  const { allSignals } = usePatterns(data, months);

  const visible = allSignals.filter(
    s =>
      (dimFilter === "all" || s.dimension === dimFilter) &&
      (sevFilter === "all" || s.severity === sevFilter),
  );

  // ── FIX (MEDIUM): Both heatData and heatCats were computed directly in the
  //    render body without useMemo. For large datasets they would recompute on
  //    every render (e.g. every filter button click), causing noticeable lag.
  const heatData = useMemo(
    () =>
      months.map(m => {
        const cats = [
          ...new Set(
            (data.raw_records ?? []).map(r => r.category).filter(Boolean),
          ),
        ];
        const row: Record<string, unknown> = { month: m };
        cats.forEach(cat => {
          row[cat] = (data.raw_records ?? []).filter(
            r =>
              r.category === cat &&
              (r.sys_created_on ?? "").startsWith(m),
          ).length;
        });
        return row;
      }),
    [months, data.raw_records],
  );

  const heatCats = useMemo(
    () =>
      heatData.length
        ? Object.keys(heatData[0]!).filter(k => k !== "month")
        : [],
    [heatData],
  );

  const heatMax = useMemo(
    () =>
      heatData.reduce(
        (max, row) =>
          Math.max(max, ...heatCats.map(c => (row[c] as number) || 0)),
        1,
      ),
    [heatData, heatCats],
  );

  const heatColor = (v: number) => {
    if (!v) return "#1a2f6e";
    const ratio = v / heatMax;
    if (ratio > 0.7) return "#ef4444";
    if (ratio > 0.4) return "#f59e0b";
    return "#3d6fd4";
  };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-theme-dim">Dimension:</span>
        {(["all", "Category", "Resolver Group", "Combined", "Keyword"] as DimFilter[]).map(
          f => (
            <button
              key={f}
              onClick={() => setDimFilter(f)}
              className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                dimFilter === f
                  ? "border-theme-blue text-theme-accent bg-theme-blue/20 font-bold"
                  : "border-theme-border text-theme-dim"
              }`}
            >
              {f === "all" ? "All" : f}
            </button>
          ),
        )}
        <span className="text-xs text-theme-dim ml-4">Severity:</span>
        {(["all", "high", "medium", "low"] as SevFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setSevFilter(f)}
            className="px-2.5 py-1 rounded text-xs border transition-colors"
            style={{
              borderColor:
                f === "all"
                  ? sevFilter === "all"
                    ? "#3d6fd4"
                    : undefined
                  : SEV_COLOR[f as SignalSeverity],
              color:
                f === sevFilter
                  ? f === "all"
                    ? "#5b9fff"
                    : SEV_COLOR[f as SignalSeverity]
                  : "#6b8fd4",
              backgroundColor:
                f === sevFilter
                  ? `${f === "all" ? "#3d6fd4" : SEV_COLOR[f as SignalSeverity]}22`
                  : undefined,
            }}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span className="ml-auto text-xs text-theme-dim">
          {visible.length} signal{visible.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Signal grid */}
      {visible.length === 0 ? (
        <div className="text-center py-12 text-theme-dim text-sm">
          No signals match the current filters.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {visible.map(sig => (
            <SignalCard key={sig.id} sig={sig} />
          ))}
        </div>
      )}

      {/* Category volume heatmap */}
      {heatCats.length > 0 && (
        <Card>
          <SectionTitle>Category Volume Heatmap</SectionTitle>
          <div className="overflow-x-auto">
            <table className="text-[10px] border-collapse w-full min-w-[500px]">
              <thead>
                <tr>
                  <th className="text-left py-1 pr-3 text-theme-dim font-semibold w-28">
                    Category
                  </th>
                  {months.map(m => (
                    <th
                      key={m}
                      className="text-center px-1 py-1 text-theme-dim font-semibold"
                    >
                      {m.slice(5)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatCats.map(cat => (
                  <tr key={cat}>
                    <td className="py-1 pr-3 text-theme-text font-semibold whitespace-nowrap">
                      {cat}
                    </td>
                    {months.map(m => {
                      const v =
                        ((heatData.find(r => r.month === m)?.[cat] as number) || 0);
                      return (
                        <td
                          key={m}
                          className="px-1 py-1 text-center rounded font-bold"
                          style={{
                            background: `${heatColor(v)}33`,
                            color:      heatColor(v),
                          }}
                        >
                          {v || ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
