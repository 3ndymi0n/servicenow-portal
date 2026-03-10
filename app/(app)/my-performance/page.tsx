"use client";
import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQuery }   from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { KpiCard }          from "@/components/ui/KpiCard";
import { Card, SectionTitle } from "@/components/ui/Card";
import { ChartTooltip }     from "@/components/ui/ChartTooltip";
import { DataTable, type ColDef } from "@/components/ui/DataTable";
import { ErrorBoundary }    from "@/components/ui/ErrorBoundary";
import type { AnalyticsData, Customer } from "@/types";
import type { SessionUser } from "@/lib/auth/session";
import { CLOSED_STATES }    from "@/lib/analytics/constants";
// ── FIX (HIGH + MEDIUM): Import shared SLA helper and perf index util.
//    Previously this page duplicated both the SLA threshold map (also in
//    TechnicianStatsModal) and used a different performance index formula
//    with an opaque magic constant (65*0.35) that inflated every score.
import { isWithinSla }          from "@/lib/analytics/slaThresholds";
import { calcPerfIndex }        from "@/lib/analytics/perfIndex";
import { r1 }               from "@/lib/utils";

const COLORS    = ["#3d6fd4","#14b8a6","#f59e0b","#a855f7","#22c55e"];
const PERF_COLOR = (v: number) => v >= 75 ? "#22c55e" : v >= 55 ? "#f59e0b" : "#ef4444";

export default function MyPerformancePage() {
  const { data: session } = useSession();
  const user    = session?.user as SessionUser | undefined;
  const empName = user?.displayName ?? user?.username ?? "";

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn:  () => fetch("/api/customers").then(r => r.json()),
  });

  const custIds = customers.map(c => c.id);
  const queries = useQuery<Record<string, AnalyticsData | null>>({
    queryKey: ["empAllData", custIds.join(",")],
    queryFn: async () => {
      const results: Record<string, AnalyticsData | null> = {};
      await Promise.all(
        custIds.map(async id => {
          const res = await fetch(`/api/customers/${id}/data`);
          results[id] = res.ok ? await res.json() : null;
        }),
      );
      return results;
    },
    enabled: custIds.length > 0,
  });

  const allData = queries.data ?? {};

  const custStats = useMemo(
    () =>
      customers
        .map(cust => {
          const d = allData[cust.id];
          if (!d?.raw_records?.length) return null;
          const mine = d.raw_records.filter(r => r.assigned_to?.trim() === empName);
          if (!mine.length) return null;

          const closed = mine.filter(r =>
            CLOSED_STATES.has((r.state ?? "").toLowerCase()),
          );
          const slaMet = mine.filter(r =>
            isWithinSla(r.sys_created_on, r.sys_updated_on, r.priority),
          );
          const resTimes = closed
            .map(r => {
              const c = new Date(r.sys_created_on || 0).getTime();
              const u = new Date(r.sys_updated_on || r.sys_created_on || 0).getTime();
              return (u - c) / 3_600_000;
            })
            .filter(h => h > 0);
          const avgRes = resTimes.length
            ? r1(resTimes.reduce((s, v) => s + v, 0) / resTimes.length)
            : 0;
          const slaPct      = mine.length ? Math.round((slaMet.length / mine.length) * 100) : 0;
          const closeRatePct = mine.length ? Math.round((closed.length / mine.length) * 100) : 0;

          // ── FIX (HIGH): Use the shared calcPerfIndex utility so this page
          //    produces the same score as TechniciansTab for the same technician.
          //    The old formula was: slaPct*0.4 + closeRate*0.25 + 65*0.35
          //    The magic `65` was a placeholder for missing FCR/Reopen/Reassign
          //    data, silently inflating every score by ~23 points.
          //    The shared utility uses a neutral 50% fallback for unavailable
          //    inputs, which is transparent and consistent.
          const perfIndex = calcPerfIndex({
            slaPct,
            fcrPct:      null,   // not available at this aggregation level
            reopenPct:   null,
            reassignPct: null,
          });

          return {
            custId: cust.id, custName: cust.name,
            total: mine.length, closed: closed.length,
            slaPct, avgRes, perfIndex,
          };
        })
        .filter(Boolean) as Array<{
          custId: string; custName: string;
          total: number; closed: number;
          slaPct: number; avgRes: number; perfIndex: number;
        }>,
    [customers, allData, empName],
  );

  const agg = useMemo(() => {
    if (!custStats.length) return null;
    const totTotal  = custStats.reduce((s, c) => s + c.total,  0);
    const totClosed = custStats.reduce((s, c) => s + c.closed, 0);
    const avgSla    = r1(custStats.reduce((s, c) => s + c.slaPct,     0) / custStats.length);
    const avgRes    = r1(custStats.reduce((s, c) => s + c.avgRes,     0) / custStats.length);
    const perf      = r1(custStats.reduce((s, c) => s + c.perfIndex,  0) / custStats.length);
    return { totTotal, totClosed, avgSla, avgRes, perf };
  }, [custStats]);

  const months = useMemo(() => {
    const set = new Set<string>();
    Object.values(allData).forEach(d =>
      d?.raw_records?.forEach(r => {
        const m = (r.sys_updated_on || r.sys_created_on || "").slice(0, 7);
        if (m.match(/^\d{4}-\d{2}$/)) set.add(m);
      }),
    );
    return [...set].sort();
  }, [allData]);

  const closedOverTime = useMemo(
    () =>
      months.map(m => {
        const row: Record<string, string | number> = { month: m };
        customers.forEach(c => {
          const d = allData[c.id];
          row[c.name] = (d?.raw_records ?? []).filter(
            r =>
              r.assigned_to?.trim() === empName &&
              CLOSED_STATES.has((r.state ?? "").toLowerCase()) &&
              (r.sys_updated_on || r.sys_created_on || "").slice(0, 7) === m,
          ).length;
        });
        return row;
      }),
    [months, customers, allData, empName],
  );

  const TABLE_COLS: ColDef[] = [
    { key: "custName",  label: "Customer",    bold: true  },
    { key: "total",     label: "Total",       right: true },
    { key: "closed",    label: "Closed",      right: true },
    { key: "slaPct",    label: "SLA %",       right: true },
    { key: "avgRes",    label: "Avg Res (h)", right: true },
    { key: "perfIndex", label: "Perf Index",  right: true },
  ];

  return (
    <div className="flex-1 p-6 animate-fade-in overflow-auto">
      <div className="mb-5">
        <h1 className="text-xl font-extrabold text-theme-text">My Performance</h1>
        <div className="text-xs text-theme-dim mt-0.5">
          {empName} · Employee Dashboard
        </div>
      </div>

      {!agg ? (
        <div className="py-20 text-center text-theme-dim text-sm">
          No ticket data found for {empName}.
        </div>
      ) : (
        <ErrorBoundary label="my-performance">
          <div className="grid grid-cols-5 gap-3 mb-5">
            <KpiCard label="Total Assigned" value={agg.totTotal}  color="#3d6fd4" />
            <KpiCard label="Total Closed"   value={agg.totClosed} color="#22c55e" />
            <KpiCard label="Avg SLA Met"    value={`${agg.avgSla}%`}
              color={agg.avgSla >= 90 ? "#22c55e" : agg.avgSla >= 75 ? "#f59e0b" : "#ef4444"} />
            <KpiCard label="Avg Resolution" value={`${agg.avgRes}h`} color="#f59e0b" />
            <KpiCard label="Perf Index"     value={agg.perf} color={PERF_COLOR(agg.perf)} />
          </div>

          {closedOverTime.length > 1 && (
            <Card className="mb-4">
              <SectionTitle>Tickets Closed Per Month</SectionTitle>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={closedOverTime} margin={{ left: -5, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "#6b8fd4", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6b8fd4", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {customers.map((c, i) => (
                    <Line key={c.id} type="monotone" dataKey={c.name}
                      stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          <Card>
            <SectionTitle>By Customer</SectionTitle>
            <DataTable
              cols={TABLE_COLS}
              rows={custStats as unknown as Record<string, unknown>[]}
              colorCell={(key, val) => {
                const v = val as number;
                if (key === "slaPct")    return v >= 90 ? "#22c55e" : v >= 75 ? "#f59e0b" : "#ef4444";
                if (key === "perfIndex") return PERF_COLOR(v);
                return undefined;
              }}
            />
          </Card>
        </ErrorBoundary>
      )}
    </div>
  );
}
