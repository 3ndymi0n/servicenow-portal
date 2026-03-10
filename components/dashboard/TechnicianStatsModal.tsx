"use client";
import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Modal }        from "@/components/ui/Modal";
import { KpiCard }      from "@/components/ui/KpiCard";
import { ChartTooltip } from "@/components/ui/ChartTooltip";
import { SectionTitle } from "@/components/ui/Card";
import type { TechnicianStats, RawTicket } from "@/types";
import { CLOSED_STATES }  from "@/lib/analytics/constants";
// ── FIX (MEDIUM): Import shared SLA helper instead of duplicating the
//    threshold map here. Previously identical magic-number objects appeared
//    in both this file and my-performance/page.tsx.
import { isWithinSla } from "@/lib/analytics/slaThresholds";

interface Props {
  techName:   string;
  techRow:    TechnicianStats | null;
  rawRecords: RawTicket[];
  months:     string[];
  onClose:    () => void;
}

const PRIORITIES = ["1 - Critical", "2 - High", "3 - Moderate", "4 - Low"];
const PRI_COLOR  = {
  "1 - Critical": "#ef4444",
  "2 - High":     "#f59e0b",
  "3 - Moderate": "#3d6fd4",
  "4 - Low":      "#6b8fd4",
} as Record<string, string>;
const PERF_COLOR = (v: number) =>
  v >= 75 ? "#22c55e" : v >= 55 ? "#f59e0b" : "#ef4444";

export function TechnicianStatsModal({
  techName,
  techRow,
  rawRecords,
  months,
  onClose,
}: Props) {
  const tickets = useMemo(
    () =>
      rawRecords.filter(
        r =>
          r.assigned_to?.trim() === techName &&
          months.includes((r.sys_created_on ?? "").slice(0, 7)),
      ),
    [rawRecords, techName, months],
  );

  const closed = useMemo(
    () =>
      tickets.filter(r =>
        CLOSED_STATES.has((r.state ?? "").toLowerCase()),
      ),
    [tickets],
  );

  const slaMet = useMemo(
    () =>
      tickets.filter(r =>
        isWithinSla(r.sys_created_on, r.sys_updated_on, r.priority),
      ),
    [tickets],
  );

  const closedByMonth = useMemo(
    () =>
      months.map(m => ({
        month: m,
        Closed: closed.filter(
          r => (r.sys_updated_on || r.sys_created_on || "").slice(0, 7) === m,
        ).length,
      })),
    [months, closed],
  );

  const priBreakdown = useMemo(
    () =>
      PRIORITIES.map(p => {
        const pTickets = tickets.filter(r => r.priority === p);
        const pClosed  = pTickets.filter(r =>
          CLOSED_STATES.has((r.state ?? "").toLowerCase()),
        );
        return {
          priority: p,
          total:    pTickets.length,
          closed:   pClosed.length,
          pct:      pTickets.length
            ? Math.round((pClosed.length / pTickets.length) * 100)
            : 0,
        };
      }),
    [tickets],
  );

  const categories = useMemo(() => {
    const map = new Map<string, { total: number; closed: number }>();
    tickets.forEach(r => {
      const cat = r.category || "Unknown";
      if (!map.has(cat)) map.set(cat, { total: 0, closed: 0 });
      const e = map.get(cat)!;
      e.total++;
      if (CLOSED_STATES.has((r.state ?? "").toLowerCase())) e.closed++;
    });
    return [...map.entries()]
      .map(([cat, v]) => ({
        cat,
        ...v,
        pct: v.total ? Math.round((v.closed / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [tickets]);

  const initials   = techName.split(" ").map(w => w[0]?.toUpperCase() || "").join("").slice(0, 2);
  const perfIndex  = techRow?.["Perf Index"] ?? 0;
  const slaPct     = tickets.length
    ? Math.round((slaMet.length / tickets.length) * 100)
    : (techRow?.["SLA Met %"] ?? 0);

  return (
    <Modal open onClose={onClose} size="xl" title="">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-theme-border">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-extrabold"
            style={{ background: "#14b8a622", color: "#14b8a6" }}
          >
            {initials}
          </div>
          <div className="flex-1">
            <div className="text-xl font-extrabold text-theme-text">{techName}</div>
            <div className="text-xs text-theme-dim mt-0.5">
              {techRow?.Group ?? "—"} · {months[0]} → {months[months.length - 1]}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-theme-dim mb-1">Perf Index</div>
            <div
              className="text-3xl font-extrabold"
              style={{ color: PERF_COLOR(perfIndex) }}
            >
              {perfIndex}
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-6 gap-3 mb-6">
          <KpiCard label="Total Tickets"  value={tickets.length}  color="#3d6fd4" />
          <KpiCard
            label="Closed"
            value={closed.length}
            color="#22c55e"
            sub={`${tickets.length ? Math.round((closed.length / tickets.length) * 100) : 0}%`}
          />
          <KpiCard
            label="SLA Met"
            value={`${slaPct}%`}
            color={slaPct >= 90 ? "#22c55e" : slaPct >= 75 ? "#f59e0b" : "#ef4444"}
          />
          <KpiCard label="FCR Rate"       value={`${techRow?.["FCR %"] ?? 0}%`}           color="#14b8a6" />
          <KpiCard
            label="Reopen Rate"
            value={`${techRow?.["Reopen Rate %"] ?? 0}%`}
            color={(techRow?.["Reopen Rate %"] ?? 0) > 10 ? "#ef4444" : "#22c55e"}
          />
          <KpiCard label="Avg Resolution" value={`${techRow?.["Avg Res (hrs)"] ?? 0}h`}  color="#f59e0b" />
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Closed per month */}
          <div>
            <SectionTitle>Tickets Closed Per Month</SectionTitle>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={closedByMonth} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#6b8fd4", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b8fd4", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="Closed" stroke="#14b8a6" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* By priority */}
          <div>
            <SectionTitle>By Priority — Close Rate</SectionTitle>
            <div className="space-y-3 mt-2">
              {priBreakdown.filter(p => p.total > 0).map(p => (
                <div key={p.priority}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold" style={{ color: PRI_COLOR[p.priority] }}>
                      {p.priority}
                    </span>
                    <span className="text-theme-dim">
                      {p.closed}/{p.total} · <b className="text-theme-text">{p.pct}%</b>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-theme-muted">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${p.pct}%`, background: PRI_COLOR[p.priority] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* By category */}
        <div className="mt-6">
          <SectionTitle>By Category — Close Rate</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {categories.map(c => (
              <div key={c.cat} className="bg-theme-card rounded-md p-3 border border-theme-border">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-theme-text">{c.cat}</span>
                  <span className="text-xs text-theme-dim">
                    {c.closed}/{c.total} · <b className="text-theme-accent">{c.pct}%</b>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-theme-muted">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width:      `${c.pct}%`,
                      background: c.pct >= 80 ? "#22c55e" : c.pct >= 60 ? "#f59e0b" : "#ef4444",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
