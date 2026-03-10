"use client";
import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import type { AnalyticsData } from "@/types";
import { KpiCard }      from "@/components/ui/KpiCard";
import { Card, SectionTitle } from "@/components/ui/Card";
import { ChartTooltip } from "@/components/ui/ChartTooltip";
import { useKpis }      from "@/hooks/analytics/useKpis";
import { getDataMonths } from "@/lib/analytics/dateFilter";

const CHART_COLORS = {
  blue:   "#3d6fd4",
  teal:   "#14b8a6",
  amber:  "#f59e0b",
  red:    "#ef4444",
  green:  "#22c55e",
};

interface OverviewTabProps {
  data:   AnalyticsData;
  months: string[];
}

export function OverviewTab({ data, months }: OverviewTabProps) {
  const dataMonths = useMemo(() => getDataMonths(data), [data]);
  const kpis = useKpis(data, months, dataMonths);

  const volData = useMemo(
    () => (data.monthly_volume ?? []).filter(r => months.includes(r.Month as string)),
    [data, months],
  );
  const prioData = useMemo(
    () => (data.monthly_priority ?? []).filter(r => months.includes(r.month as string)),
    [data, months],
  );

  // ── FIX (CRITICAL): This useMemo must be declared unconditionally, BEFORE
  //    the `if (!kpis) return null` guard below. The original code placed it
  //    after the guard, violating the Rules of Hooks — calling a hook
  //    conditionally causes a guaranteed runtime crash on first render.
  const mom = useMemo(() => {
    if (volData.length < 2) return null;
    const cur  = volData[volData.length - 1]!;
    const prev = volData[volData.length - 2]!;
    const delta = (a: number, b: number) =>
      b ? Math.round(((a - b) / b) * 100) : null;
    return {
      vol: delta(cur.Total as number,     prev.Total as number),
      inc: delta(cur.Incidents as number, prev.Incidents as number),
    };
  }, [volData]);

  // Safe to return early here — all hooks have been called above.
  if (!kpis) return null;

  const momBadge = (val: number | null) => {
    if (val === null) return null;
    const color =
      val < 0 ? CHART_COLORS.green : val > 0 ? CHART_COLORS.red : "#6b8fd4";
    return (
      <span style={{ color }} className="font-bold ml-1">
        {val > 0 ? `▲${val}%` : val < 0 ? `▼${Math.abs(val)}%` : "—"}
      </span>
    );
  };

  return (
    <div className="animate-fade-in">
      {/* ── FIX (LOW): Responsive KPI grid — was hard-coded `grid-cols-4`.
           Now stacks to 2 columns on small/narrow screens. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Total Tickets"   value={kpis.total}    color={CHART_COLORS.blue}
          sub={<span>{months.length}-month window {momBadge(mom?.vol ?? null)}</span>} />
        <KpiCard label="Incidents"       value={kpis.totalInc} color={CHART_COLORS.blue}
          sub={<span>of {kpis.total} total {momBadge(mom?.inc ?? null)}</span>} />
        <KpiCard label="Catalog Tasks"   value={kpis.totalCat} color={CHART_COLORS.teal} />
        <KpiCard label="Resolver Groups" value={kpis.groups}   color="#a855f7"
          sub={`${kpis.techs} technicians`} />
        <KpiCard label="Avg Resolution"  value={`${kpis.mttr}h`} color={CHART_COLORS.amber}
          sub={`Median: ${kpis.medianTtr}h`} />
        <KpiCard label="SLA Met"         value={`${kpis.slaMet}%`}
          color={kpis.slaMet >= 90 ? CHART_COLORS.green : CHART_COLORS.red}
          flag={kpis.slaMet < 90 ? "bad" : undefined}
          sub={`${kpis.slaBreach}% breached`} />
        <KpiCard label="Critical / High" value={kpis.critHigh} color={CHART_COLORS.red}
          sub={`${kpis.critPct}% of incidents`} flag="warn" />
        <KpiCard label="Reopen Rate"     value={`${kpis.reopenRate}%`} color={CHART_COLORS.amber}
          sub={`Reassign: ${kpis.reassignRate}%`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <SectionTitle>Monthly Volume</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={volData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
              <XAxis dataKey="Month" tick={{ fill: "#6b8fd4", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b8fd4", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Incidents"     fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Catalog Tasks" fill={CHART_COLORS.teal} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle>Monthly Priority Mix</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={prioData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#6b8fd4", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b8fd4", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="1 - Critical" fill={CHART_COLORS.red}   stackId="a" />
              <Bar dataKey="2 - High"     fill={CHART_COLORS.amber} stackId="a" />
              <Bar dataKey="3 - Moderate" fill={CHART_COLORS.blue}  stackId="a" />
              <Bar dataKey="4 - Low"      fill="#6b8fd4"            stackId="a" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
