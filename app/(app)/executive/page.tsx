"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, SectionTitle } from "@/components/ui/Card";
import { ChartTooltip } from "@/components/ui/ChartTooltip";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { FilterSidebar } from "@/components/layout/FilterSidebar";
import { PatternsTab } from "@/components/dashboard/PatternsTab";
import { useUIStore } from "@/store/uiStore";
import type { AnalyticsData, Customer } from "@/types";
import type { FilterSection } from "@/components/layout/FilterSidebar";
import { r1 } from "@/lib/utils";

const COLORS = [
  "#3d6fd4",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#22c55e",
];
const TABS = [
  { id: "scorecard", label: "Health Scorecard" },
  { id: "volume", label: "Volume Trends" },
  { id: "sla", label: "SLA Comparison" },
  { id: "priority", label: "Priority Mix" },
  { id: "patterns", label: "🔍 Patterns" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function execRag(sla: number): "green" | "amber" | "red" {
  return sla >= 90 ? "green" : sla >= 75 ? "amber" : "red";
}
const RAG_COLOR = { green: "#22c55e", amber: "#f59e0b", red: "#ef4444" };

// Toggle helper — returns null if all items selected (null = all)
function toggleFilter(
  prev: string[] | null,
  id: string,
  checked: boolean,
  allIds: string[],
): string[] | null {
  const current = new Set<string>(prev ?? allIds);
  checked ? current.add(id) : current.delete(id);
  return current.size === allIds.length ? null : [...current];
}

export default function ExecutivePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("scorecard");

  const { execSelectedCustIds, setExecSelectedCustIds } = useUIStore();

  const { data: allCustomers = [] } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: () => fetch("/api/customers").then((r) => r.json()),
  });

  // Customers visible in charts — filtered by sidebar selection
  const customers = useMemo(() => {
    if (!execSelectedCustIds) return allCustomers;
    const sel = new Set(execSelectedCustIds);
    return allCustomers.filter((c) => sel.has(c.id));
  }, [allCustomers, execSelectedCustIds]);

  const allData = useQuery<Record<string, AnalyticsData | null>>({
    queryKey: ["execAllData", allCustomers.map((c) => c.id).join(",")],
    queryFn: async () => {
      const results: Record<string, AnalyticsData | null> = {};
      await Promise.all(
        allCustomers.map(async (c) => {
          const res = await fetch(`/api/customers/${c.id}/data`);
          results[c.id] = res.ok ? await res.json() : null;
        }),
      );
      return results;
    },
    enabled: allCustomers.length > 0,
  });

  const dataMap = allData.data ?? {};

  const scorecard = useMemo(
    () =>
      customers.map((c) => {
        const d = dataMap[c.id];
        if (!d)
          return {
            id: c.id,
            name: c.name,
            code: c.code,
            total: 0,
            sla: 0,
            mttr: 0,
            crit: 0,
            rag: "amber" as const,
            noData: true,
          };
        const sla = d.dashboard.sla_met as number;
        return {
          id: c.id,
          name: c.name,
          code: c.code,
          total: d.dashboard.total as number,
          sla,
          mttr: d.dashboard.mttr as number,
          crit: d.dashboard.crit_pct as number,
          rag: execRag(sla),
          noData: false,
        };
      }),
    [customers, dataMap],
  );

  const combinedVolume = useMemo(() => {
    const monthMap = new Map<string, Record<string, number>>();
    customers.forEach((c) => {
      (dataMap[c.id]?.monthly_volume ?? []).forEach((r) => {
        if (!monthMap.has(r.Month as string))
          monthMap.set(r.Month as string, {});
        monthMap.get(r.Month as string)![c.name] = r.Total as number;
      });
    });
    return [...monthMap.entries()]
      .sort()
      .map(([month, vals]) => ({ month, ...vals }));
  }, [customers, dataMap]);

  const slaComparison = useMemo(
    () =>
      scorecard
        .filter((s) => !s.noData)
        .map((s) => ({
          name: s.code,
          "SLA Met %": s.sla,
          Target: 90,
        })),
    [scorecard],
  );

  const portfolio = useMemo(() => {
    const active = scorecard.filter((s) => !s.noData);
    if (!active.length) return null;
    return {
      totalTickets: active.reduce((s, c) => s + c.total, 0),
      avgSla: r1(active.reduce((s, c) => s + c.sla, 0) / active.length),
      avgMttr: r1(active.reduce((s, c) => s + c.mttr, 0) / active.length),
      customersBelow90: active.filter((c) => c.sla < 90).length,
    };
  }, [scorecard]);

  const combinedMockData = useMemo(() => {
    const allRecords = customers.flatMap(
      (c) => dataMap[c.id]?.raw_records ?? [],
    );
    if (!allRecords.length) return null;
    return {
      raw_records: allRecords,
      dashboard: {},
      monthly_volume: [],
      monthly_sla: [],
    } as unknown as AnalyticsData;
  }, [customers, dataMap]);

  const allMonths = useMemo(() => {
    const s = new Set<string>();
    customers.forEach((c) =>
      (dataMap[c.id]?.monthly_volume ?? []).forEach((r) =>
        s.add(r.Month as string),
      ),
    );
    return [...s].sort();
  }, [customers, dataMap]);

  const allCustIds = allCustomers.map((c) => c.id);

  const sidebarSections: FilterSection[] = [
    {
      id: "customers",
      label: "Customer",
      multiSelect: true,
      selected: execSelectedCustIds,
      items:
        allCustomers.length > 0
          ? allCustomers.map((c) => ({
              id: c.id,
              label: c.name,
              sublabel: c.code,
            }))
          : [{ id: "loading", label: "Loading…" }],
      onSelectAll: () => setExecSelectedCustIds(null),
      onChange: (id, checked) => {
        setExecSelectedCustIds(
          toggleFilter(execSelectedCustIds, id, checked, allCustIds),
        );
      },
    },
  ];

  return (
    <div className="flex-1 flex overflow-hidden">
      <FilterSidebar sections={sidebarSections} />

      <div className="flex-1 p-6 overflow-auto">
        <div className="flex justify-between items-baseline mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-dark-text">
              Executive Dashboard
            </h1>
            <div className="text-xs text-dark-dim mt-0.5">
              {customers.length} of {allCustomers.length} customers · Portfolio
              view
            </div>
          </div>
          {portfolio && (
            <div className="flex gap-4 text-xs text-dark-dim">
              <span>
                Portfolio total:{" "}
                <b className="text-dark-accent">
                  {portfolio.totalTickets.toLocaleString()}
                </b>{" "}
                tickets
              </span>
              <span>
                Avg SLA:{" "}
                <b
                  style={{
                    color:
                      portfolio.avgSla >= 90
                        ? "#22c55e"
                        : portfolio.avgSla >= 75
                          ? "#f59e0b"
                          : "#ef4444",
                  }}
                >
                  {portfolio.avgSla}%
                </b>
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-1 flex-wrap mb-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-1.5 rounded text-xs font-semibold transition-colors ${
                activeTab === t.id
                  ? "bg-dark-blue/20 text-dark-accent border border-dark-blue"
                  : "text-dark-dim hover:text-dark-text border border-transparent hover:border-dark-border"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <ErrorBoundary label={activeTab}>
          {activeTab === "scorecard" && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3 mb-2">
                {portfolio && (
                  <>
                    <KpiCard
                      label="Total Portfolio Tickets"
                      value={portfolio.totalTickets.toLocaleString()}
                      color="#3d6fd4"
                    />
                    <KpiCard
                      label="Portfolio Avg SLA"
                      value={`${portfolio.avgSla}%`}
                      color={
                        portfolio.avgSla >= 90
                          ? "#22c55e"
                          : portfolio.avgSla >= 75
                            ? "#f59e0b"
                            : "#ef4444"
                      }
                    />
                    <KpiCard
                      label="Portfolio Avg MTTR"
                      value={`${portfolio.avgMttr}h`}
                      color="#f59e0b"
                    />
                    <KpiCard
                      label="Customers Below 90% SLA"
                      value={portfolio.customersBelow90}
                      color={portfolio.customersBelow90 ? "#ef4444" : "#22c55e"}
                    />
                  </>
                )}
              </div>
              <Card>
                <SectionTitle>Customer Health Scorecard</SectionTitle>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-dark-border text-dark-dim text-[10px] uppercase">
                      <th className="text-left py-2 pr-4">Customer</th>
                      <th className="text-right py-2 px-3">Tickets</th>
                      <th className="text-right py-2 px-3">SLA %</th>
                      <th className="text-right py-2 px-3">MTTR</th>
                      <th className="text-right py-2 px-3">Crit %</th>
                      <th className="text-center py-2 px-3">RAG</th>
                      <th className="py-2 pl-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {scorecard.map((c) => (
                      <tr key={c.id} className="border-b border-dark-border/20">
                        <td className="py-2 pr-4 font-bold text-dark-text">
                          {c.name}
                        </td>
                        <td className="py-2 px-3 text-right text-dark-dim">
                          {c.total.toLocaleString()}
                        </td>
                        <td
                          className="py-2 px-3 text-right font-bold"
                          style={{ color: RAG_COLOR[c.rag] }}
                        >
                          {c.sla}%
                        </td>
                        <td className="py-2 px-3 text-right text-dark-dim">
                          {c.mttr}h
                        </td>
                        <td className="py-2 px-3 text-right text-dark-dim">
                          {c.crit}%
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex justify-center">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ background: RAG_COLOR[c.rag] }}
                            />
                          </div>
                        </td>
                        <td className="py-2 pl-3">
                          {!c.noData && (
                            <button
                              onClick={() => router.push(`/dashboard/${c.id}`)}
                              className="text-dark-dim hover:text-dark-accent text-xs"
                            >
                              View →
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {activeTab === "volume" && combinedVolume.length > 0 && (
            <Card>
              <SectionTitle>Monthly Volume by Customer</SectionTitle>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={combinedVolume}
                  margin={{ left: -5, right: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#142466"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#6b8fd4", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#6b8fd4", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {customers.map((c, i) => (
                    <Bar
                      key={c.id}
                      dataKey={c.name}
                      fill={COLORS[i % COLORS.length]}
                      stackId="a"
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {activeTab === "sla" && (
            <Card>
              <SectionTitle>SLA Met % by Customer</SectionTitle>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={slaComparison} margin={{ left: -5, right: 30 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#142466"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#6b8fd4", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "#6b8fd4", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="SLA Met %"
                    fill="#3d6fd4"
                    radius={[4, 4, 0, 0]}
                    label={{
                      position: "top",
                      fill: "#dce8ff",
                      fontSize: 10,
                      formatter: (v: number) => `${v}%`,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Target"
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {activeTab === "priority" && (
            <div className="grid grid-cols-2 gap-4">
              {scorecard
                .filter((s) => !s.noData)
                .map((s) => {
                  const priData = dataMap[s.id]?.sla_priority ?? [];
                  return (
                    <Card key={s.id}>
                      <SectionTitle>{s.name} — Priority Mix</SectionTitle>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={priData}
                            dataKey="Total"
                            nameKey="priority"
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                          >
                            {priData.map((_, idx) => (
                              <Cell
                                key={idx}
                                fill={
                                  ["#ef4444", "#f59e0b", "#3d6fd4", "#6b8fd4"][
                                    idx
                                  ] ?? COLORS[idx]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </Card>
                  );
                })}
            </div>
          )}

          {activeTab === "patterns" && combinedMockData && (
            <PatternsTab data={combinedMockData} months={allMonths} />
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
}
