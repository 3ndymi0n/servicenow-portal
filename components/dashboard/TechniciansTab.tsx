"use client";
import { useState, useMemo } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LineChart, Line,
} from "recharts";
import type { AnalyticsData, TechnicianStats } from "@/types";
import { Card, SectionTitle }   from "@/components/ui/Card";
import { DataTable, type ColDef } from "@/components/ui/DataTable";
import { ChartTooltip }          from "@/components/ui/ChartTooltip";
import { TechnicianStatsModal }  from "@/components/dashboard/TechnicianStatsModal";
import { ErrorBoundary }         from "@/components/ui/ErrorBoundary";
import { useTechTrend }          from "@/hooks/analytics/useTechTrend";
import { monthRatio }            from "@/lib/analytics/dateFilter";
import { buildHistogram, buildMedianAvgGap, scaleTechnicianRow } from "@/lib/analytics/selectors";

const LINE_COLORS = [
  "#3d6fd4","#14b8a6","#f59e0b","#ef4444","#a855f7","#22c55e",
  "#e879f9","#f97316","#06b6d4","#84cc16","#fb923c","#38bdf8",
  "#c084fc","#4ade80","#fb7185",
];
const PERF_COLOR = (v: number) =>
  v >= 75 ? "#22c55e" : v >= 55 ? "#f59e0b" : "#ef4444";

type SortKey =
  | "Perf Index"
  | "Total"
  | "SLA Met %"
  | "FCR %"
  | "Avg Res (hrs)"
  | "Reopen Rate %";

const COLS: ColDef<TechnicianStats>[] = [
  { key: "Technician",    label: "Technician",  bold: true  },
  { key: "Group",         label: "Group"                    },
  { key: "Total",         label: "Tickets",     right: true },
  { key: "Incidents",     label: "Incidents",   right: true },
  { key: "Catalog Tasks", label: "Catalog",     right: true },
  { key: "SLA Met %",     label: "SLA %",       right: true },
  { key: "FCR %",         label: "FCR %",       right: true },
  { key: "Reopen Rate %", label: "Reopen %",    right: true },
  { key: "Avg Res (hrs)", label: "Avg Res",     right: true },
  { key: "Perf Index",    label: "Perf Index",  right: true },
];

interface Props {
  data:       AnalyticsData;
  months:     string[];
  dataMonths: string[];
}

export function TechniciansTab({ data, months, dataMonths }: Props) {
  const [sort,         setSort]         = useState<SortKey>("Perf Index");
  const [sortDir,      setSortDir]      = useState<"asc" | "desc">("desc");
  const [topN,         setTopN]         = useState(8);
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  // ── FIX (LOW): Track hovered bar name so we can visually highlight it,
  //    giving users a clear affordance that bars are clickable.
  const [hoveredTech,  setHoveredTech]  = useState<string | null>(null);

  const ratio  = monthRatio(months, dataMonths);
  const scaled = useMemo(
    () => (data.technicians ?? []).map(t => scaleTechnicianRow(t, ratio)),
    [data, ratio],
  );
  const sorted = useMemo(
    () =>
      [...scaled].sort((a, b) => {
        const av = (a[sort] as number) ?? -1;
        const bv = (b[sort] as number) ?? -1;
        return sortDir === "desc" ? bv - av : av - bv;
      }),
    [scaled, sort, sortDir],
  );

  const techTrend  = useTechTrend(data, months, topN);
  const histogram  = useMemo(() => buildHistogram(scaled), [scaled]);
  const medAvgData = useMemo(() => buildMedianAvgGap(scaled).slice(0, 10), [scaled]);

  const toggleSort = (k: SortKey) => {
    if (sort === k) setSortDir(d => (d === "desc" ? "asc" : "desc"));
    else { setSort(k); setSortDir("desc"); }
  };

  const selectedRow = selectedTech
    ? (data.technicians ?? []).find(t => t.Technician === selectedTech) ?? null
    : null;

  // Data for the load chart, sorted by total descending, top 10
  const loadData = useMemo(
    () => [...scaled].sort((a, b) => b.Total - a.Total).slice(0, 10),
    [scaled],
  );

  return (
    <div className="animate-fade-in space-y-4">
      {selectedTech && (
        <TechnicianStatsModal
          techName={selectedTech}
          techRow={selectedRow}
          rawRecords={data.raw_records}
          months={months}
          onClose={() => setSelectedTech(null)}
        />
      )}

      {/* Row 1: Ticket Load + Perf Index */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="flex justify-between items-baseline mb-2">
            <SectionTitle className="mb-0">Ticket Load by Technician</SectionTitle>
            {/* ── FIX (LOW): Make the click instruction more prominent with an
                 info icon, and provide a visual hover highlight per bar so the
                 cursor change is clearly tied to individual rows. */}
            <span className="text-[10px] text-theme-accent font-semibold flex items-center gap-1">
              <span>ℹ</span> Click a bar for details
            </span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={loadData}
              layout="vertical"
              margin={{ left: 90, right: 30 }}
              onClick={e => {
                const name = e?.activePayload?.[0]?.payload?.Technician as string | undefined;
                if (name) setSelectedTech(name);
              }}
              style={{ cursor: "pointer" }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#6b8fd4", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="Technician"
                width={95}
                tick={{ fill: "#6b8fd4", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="Incidents"
                stackId="a"
                onMouseEnter={(d) => setHoveredTech(d.Technician)}
                onMouseLeave={() => setHoveredTech(null)}
              >
                {loadData.map((entry, i) => (
                  <Cell
                    key={`inc-${i}`}
                    fill={hoveredTech === entry.Technician ? "#5b9fff" : "#3d6fd4"}
                    opacity={hoveredTech && hoveredTech !== entry.Technician ? 0.5 : 1}
                  />
                ))}
              </Bar>
              <Bar
                dataKey="Catalog Tasks"
                stackId="a"
                onMouseEnter={(d) => setHoveredTech(d.Technician)}
                onMouseLeave={() => setHoveredTech(null)}
              >
                {loadData.map((entry, i) => (
                  <Cell
                    key={`cat-${i}`}
                    fill={hoveredTech === entry.Technician ? "#2dd4bf" : "#14b8a6"}
                    opacity={hoveredTech && hoveredTech !== entry.Technician ? 0.5 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle>Performance Index (0–100)</SectionTitle>
          <div className="text-[11px] text-theme-dim mb-2">
            40% SLA · 25% FCR · 20% Reopen · 15% Reassign
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={[...scaled]
                .filter(t => typeof t["Perf Index"] === "number")
                .sort((a, b) => ((b["Perf Index"] ?? 0) - (a["Perf Index"] ?? 0)))
                .slice(0, 10)}
              layout="vertical"
              margin={{ left: 90, right: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "#6b8fd4", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="Technician" width={95} tick={{ fill: "#6b8fd4", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="Perf Index"
                radius={[0, 4, 4, 0]}
                fill="#3d6fd4"
                label={{ position: "right", fill: "#dce8ff", fontSize: 10, formatter: (v: number) => `${v}` }}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Row 2: Closed over time */}
      <Card>
        <div className="flex justify-between items-center mb-2">
          <SectionTitle className="mb-0">Tickets Closed Over Time</SectionTitle>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-theme-dim">Show top</span>
            {[5, 8, 10, 15].map(n => (
              <button
                key={n}
                onClick={() => setTopN(n)}
                className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                  topN === n
                    ? "border-theme-blue text-theme-accent bg-theme-blue/20 font-bold"
                    : "border-theme-border text-theme-dim"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        {techTrend.months.length < 2 ? (
          <div className="py-10 text-center text-theme-dim text-sm">
            At least 2 months of data needed.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={techTrend.rows} margin={{ top: 10, right: 20, bottom: 0, left: -5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#6b8fd4", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b8fd4", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              {techTrend.series.map((tech, i) => (
                <Line
                  key={tech}
                  type="monotone"
                  dataKey={tech}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Row 3: Histogram + Avg vs Median */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <SectionTitle>Workload Distribution</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={histogram} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#6b8fd4", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b8fd4", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" fill="#3d6fd4" radius={[4, 4, 0, 0]} name="Technicians" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle>Avg vs Median Resolution Gap (hrs)</SectionTitle>
          <div className="overflow-auto max-h-48">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-theme-border text-theme-dim text-[10px] uppercase">
                  <th className="text-left py-1 pr-2">Technician</th>
                  <th className="text-right py-1 px-2">Avg</th>
                  <th className="text-right py-1 px-2">Median</th>
                  <th className="text-right py-1 pl-2">Gap</th>
                </tr>
              </thead>
              <tbody>
                {medAvgData.map((r, i) => (
                  <tr key={i} className="border-b border-theme-border/20">
                    <td className="py-1 pr-2 text-theme-text">{r.name}</td>
                    <td className="py-1 px-2 text-right text-theme-dim">{r.avg}h</td>
                    <td className="py-1 px-2 text-right text-theme-dim">{r.median}h</td>
                    <td
                      className="py-1 pl-2 text-right font-bold"
                      style={{
                        color:
                          r.gap > 8 ? "#ef4444" : r.gap > 4 ? "#f59e0b" : "#22c55e",
                      }}
                    >
                      +{r.gap}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Row 4: Full sortable table */}
      <Card>
        <div className="flex justify-between items-center mb-3">
          <SectionTitle className="mb-0">All Technicians ({sorted.length})</SectionTitle>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-theme-dim">Sort by:</span>
            {(
              [
                "Perf Index",
                "Total",
                "SLA Met %",
                "FCR %",
                "Avg Res (hrs)",
                "Reopen Rate %",
              ] as SortKey[]
            ).map(k => (
              <button
                key={k}
                onClick={() => toggleSort(k)}
                className={`px-2 py-0.5 rounded border transition-colors ${
                  sort === k
                    ? "border-theme-blue text-theme-accent bg-theme-blue/20 font-bold"
                    : "border-theme-border text-theme-dim"
                }`}
              >
                {k} {sort === k ? (sortDir === "desc" ? "↓" : "↑") : ""}
              </button>
            ))}
          </div>
        </div>
        <DataTable
          cols={COLS as ColDef<Record<string, unknown>>[]}
          rows={sorted as unknown as Record<string, unknown>[]}
          onRowClick={row => setSelectedTech(row.Technician as string)}
          colorCell={(key, val) => {
            const v = val as number;
            if (key === "Perf Index")    return PERF_COLOR(v);
            if (key === "SLA Met %")     return v >= 90 ? "#22c55e" : v >= 75 ? "#f59e0b" : "#ef4444";
            if (key === "Reopen Rate %") return v <= 5 ? "#22c55e" : v <= 10 ? "#f59e0b" : "#ef4444";
            return undefined;
          }}
          pageSize={20}
        />
      </Card>
    </div>
  );
}
