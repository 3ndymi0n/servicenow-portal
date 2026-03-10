"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTicketData } from "@/hooks/useTicketData";
import { useCustomers } from "@/hooks/useCustomers";
import { useBusinessUnits } from "@/hooks/useBusinessUnits";
import { FilterSidebar } from "@/components/layout/FilterSidebar";
import { DateFilterBar } from "@/components/filters/DateFilterBar";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Alert } from "@/components/ui/Alert";
import { useUIStore } from "@/store/uiStore";
import { aggregateFromRawRecords } from "@/lib/analytics/aggregate";
import {
  getDataMonths,
  resolveMonthsInRange,
} from "@/lib/analytics/dateFilter";
import { DEFAULT_MONTHS } from "@/lib/analytics/constants";
import { cn } from "@/lib/utils";
import type { FilterSection } from "@/components/layout/FilterSidebar";

import { OverviewTab }     from "@/components/dashboard/OverviewTab";
import { TrendsTab }       from "@/components/dashboard/TrendsTab";
import { TechniciansTab }  from "@/components/dashboard/TechniciansTab";
import { GroupsTab }       from "@/components/dashboard/GroupsTab";
import { SlaTab }          from "@/components/dashboard/SlaTab";
import { NlpTab }          from "@/components/dashboard/NlpTab";
import { PatternsTab }     from "@/components/dashboard/PatternsTab";
import { ForecastTab }     from "@/components/dashboard/ForecastTab";
import { BenchmarkTab }    from "@/components/dashboard/BenchmarkTab";

const TABS = [
  { id: "overview",     label: "Overview"    },
  { id: "trends",       label: "Trends"      },
  { id: "technicians",  label: "Technicians" },
  { id: "groups",       label: "Groups"      },
  { id: "sla",          label: "SLA"         },
  { id: "language",     label: "Language"    },
  { id: "patterns",     label: "Patterns"    },
  { id: "forecast",     label: "Forecast"    },
  { id: "benchmark",    label: "Benchmark"   },
] as const;
type TabId = (typeof TABS)[number]["id"];

function toggleFilter(
  prev: string[] | null,
  id: string,
  checked: boolean,
  allItems: string[],
): string[] | null {
  const current = new Set<string>(prev ?? allItems);
  checked ? current.add(id) : current.delete(id);
  return current.size === allItems.length ? null : [...current];
}

export default function DashboardPage({
  params,
}: {
  params: { customerId: string };
}) {
  const router = useRouter();
  const { data: customers = [] } = useCustomers();
  const { data: allBus = [] }    = useBusinessUnits();
  const { data, isLoading, error } = useTicketData(params.customerId);

  const cust    = customers.find((c) => c.id === params.customerId);
  const custBus = allBus.filter((b) => b.customerId === params.customerId);

  const dataMonths = useMemo(() => getDataMonths(data ?? null), [data]);

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [dateFrom,  setDateFrom]  = useState(
    () => dataMonths[0] ?? DEFAULT_MONTHS[0]!,
  );
  const [dateTo, setDateTo] = useState(
    () =>
      dataMonths[dataMonths.length - 1] ??
      DEFAULT_MONTHS[DEFAULT_MONTHS.length - 1]!,
  );

  // ── FIX (HIGH): Reset date range whenever the customer changes.
  //    Previously, dateFrom/dateTo kept the previous customer's values when
  //    navigating to a different customer, causing resolveMonthsInRange to
  //    return an empty array and all charts to appear blank.
  useEffect(() => {
    if (dataMonths.length > 0) {
      setDateFrom(dataMonths[0]!);
      setDateTo(dataMonths[dataMonths.length - 1]!);
    }
  }, [params.customerId, dataMonths.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    dashSelectedBuIds,
    setDashSelectedBuIds,
    dashSelectedGroupIds,
    setDashSelectedGroupIds,
    dashSelectedTechIds,
    setDashSelectedTechIds,
    resetDashFilters,
  } = useUIStore();

  const months = useMemo(
    () => resolveMonthsInRange(dataMonths, dateFrom, dateTo),
    [dataMonths, dateFrom, dateTo],
  );

  // Groups available given BU selection
  const availableGroups = useMemo(() => {
    if (!cust) return [];
    if (!dashSelectedBuIds) return cust.resolverGroups ?? [];
    const set = new Set<string>();
    custBus
      .filter((b) => dashSelectedBuIds.includes(b.id))
      .forEach((b) => b.groups.forEach((g) => set.add(g)));
    return [...set];
  }, [cust, custBus, dashSelectedBuIds]);

  // Technicians derived from raw_records scoped to active group filter
  const availableTechs = useMemo(() => {
    if (!data?.raw_records) return [];
    const activeGroups = dashSelectedGroupIds
      ? new Set(dashSelectedGroupIds)
      : new Set(availableGroups);
    const techs = new Set<string>();
    (data.raw_records as any[]).forEach((r) => {
      if (r.assigned_to?.trim() && activeGroups.has(r.assignment_group ?? "")) {
        techs.add(r.assigned_to.trim());
      }
    });
    return [...techs].sort();
  }, [data, dashSelectedGroupIds, availableGroups]);

  const filteredData = useMemo(() => {
    if (!data) return data;

    const buGroupSet = dashSelectedBuIds
      ? new Set(
          custBus
            .filter((b) => dashSelectedBuIds.includes(b.id))
            .flatMap((b) => b.groups),
        )
      : null;
    const groupSet = dashSelectedGroupIds
      ? new Set(dashSelectedGroupIds)
      : null;
    const techSet = dashSelectedTechIds ? new Set(dashSelectedTechIds) : null;

    const hasFilter = buGroupSet || groupSet || techSet;
    if (!hasFilter) return data;

    const filtered = (data.raw_records as any[]).filter((r) => {
      const buOk    = !buGroupSet || buGroupSet.has(r.assignment_group ?? "");
      const groupOk = !groupSet   || groupSet.has(r.assignment_group ?? "");
      const techOk  = !techSet    || techSet.has((r.assigned_to ?? "").trim());
      return buOk && groupOk && techOk;
    });

    const reAgg = aggregateFromRawRecords(
      filtered,
      params.customerId,
      cust?.name ?? "",
    );
    return { ...reAgg, uploadedAt: data.uploadedAt };
  }, [
    data,
    dashSelectedBuIds,
    dashSelectedGroupIds,
    dashSelectedTechIds,
    custBus,
    params.customerId,
    cust?.name,
  ]);

  const allBuIds = custBus.map((b) => b.id);
  const isFiltered =
    dashSelectedBuIds !== null ||
    dashSelectedGroupIds !== null ||
    dashSelectedTechIds !== null;

  const sidebarSections: FilterSection[] = [
    {
      id:          "customers",
      label:       "Customer",
      multiSelect: false,
      hideAll:     true,
      selected:    [params.customerId],
      items:
        customers.length > 0
          ? customers.map((c) => ({ id: c.id, label: c.name, sublabel: c.code }))
          : [{ id: params.customerId, label: "Loading…" }],
      onChange: (id) => {
        resetDashFilters();
        router.push(`/dashboard/${id}`);
      },
    },

    ...(custBus.length > 0
      ? [
          {
            id:          "business-units",
            label:       "Business Unit",
            multiSelect: true,
            selected:    dashSelectedBuIds,
            items:       custBus.map((b) => ({ id: b.id, label: b.name })),
            onSelectAll: () => {
              setDashSelectedBuIds(null);
              setDashSelectedGroupIds(null);
              setDashSelectedTechIds(null);
            },
            onChange: (id: string, checked: boolean) => {
              setDashSelectedBuIds(
                toggleFilter(dashSelectedBuIds, id, checked, allBuIds),
              );
              setDashSelectedGroupIds(null);
              setDashSelectedTechIds(null);
            },
          } as FilterSection,
        ]
      : []),

    ...(availableGroups.length > 0
      ? [
          {
            id:          "groups",
            label:       "Resolver Group",
            multiSelect: true,
            selected:    dashSelectedGroupIds,
            items:       availableGroups.map((g) => ({ id: g, label: g })),
            onSelectAll: () => {
              setDashSelectedGroupIds(null);
              setDashSelectedTechIds(null);
            },
            onChange: (id: string, checked: boolean) => {
              setDashSelectedGroupIds(
                toggleFilter(dashSelectedGroupIds, id, checked, availableGroups),
              );
              setDashSelectedTechIds(null);
            },
          } as FilterSection,
        ]
      : []),

    ...(availableTechs.length > 0
      ? [
          {
            id:          "technicians",
            label:       "Technician",
            multiSelect: true,
            selected:    dashSelectedTechIds,
            items:       availableTechs.map((t) => ({ id: t, label: t })),
            onSelectAll: () => setDashSelectedTechIds(null),
            onChange: (id: string, checked: boolean) => {
              setDashSelectedTechIds(
                toggleFilter(dashSelectedTechIds, id, checked, availableTechs),
              );
            },
          } as FilterSection,
        ]
      : []),
  ];

  return (
    <div className="flex-1 flex overflow-hidden">
      <FilterSidebar sections={sidebarSections} />

      <div className="flex-1 p-6 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-theme-dim animate-pulse">
            Loading…
          </div>
        ) : error ? (
          <Alert type="error">Failed to load: {(error as Error).message}</Alert>
        ) : (
          <>
            <div className="mb-4">
              <h1 className="text-xl font-extrabold text-theme-text">
                {cust?.name ?? "—"}
              </h1>
              <div className="text-xs text-theme-dim mt-0.5 flex items-center gap-2 flex-wrap">
                <span>
                  {cust?.code} · {cust?.industry}
                </span>
                {data?.uploadedAt && (
                  <span>
                    · Updated{" "}
                    {new Date(data.uploadedAt).toLocaleDateString("en-AU")}
                  </span>
                )}
                {isFiltered && (
                  <span className="text-theme-accent font-semibold">
                    · Filtered
                  </span>
                )}
                {isFiltered && (
                  <button
                    onClick={() => resetDashFilters()}
                    className="text-[10px] text-theme-dim hover:text-red-400 underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {!filteredData ? (
              <div className="flex flex-col items-center justify-center py-20 text-theme-dim">
                <div className="text-5xl mb-4">📭</div>
                <div className="text-lg font-bold text-theme-text">
                  No data for {cust?.name ?? "this customer"}
                </div>
                <div className="text-sm mt-2">
                  An admin can upload data in the Admin Panel.
                </div>
              </div>
            ) : (
              <>
                <div className="flex gap-1 flex-wrap mb-4">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={cn(
                        "px-4 py-1.5 rounded text-xs font-semibold transition-colors",
                        activeTab === t.id
                          ? "bg-theme-blue/20 text-theme-accent border border-theme-blue"
                          : "text-theme-dim hover:text-theme-text border border-transparent hover:border-theme-border",
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <DateFilterBar
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  setDateFrom={setDateFrom}
                  setDateTo={setDateTo}
                  dataMonths={dataMonths}
                  activeMonths={months.length}
                />

                <ErrorBoundary label={activeTab}>
                  {activeTab === "overview" && (
                    <OverviewTab data={filteredData} months={months} />
                  )}
                  {activeTab === "trends" && (
                    <TrendsTab data={filteredData} months={months} />
                  )}
                  {activeTab === "technicians" && (
                    <TechniciansTab
                      data={filteredData}
                      months={months}
                      dataMonths={dataMonths}
                    />
                  )}
                  {activeTab === "groups" && (
                    <GroupsTab
                      data={filteredData}
                      months={months}
                      dataMonths={dataMonths}
                    />
                  )}
                  {activeTab === "sla" && (
                    <SlaTab
                      data={filteredData}
                      months={months}
                      dataMonths={dataMonths}
                    />
                  )}
                  {activeTab === "language" && (
                    <NlpTab data={filteredData} months={months} />
                  )}
                  {activeTab === "patterns" && (
                    <PatternsTab data={filteredData} months={months} />
                  )}
                  {activeTab === "forecast" && (
                    <ForecastTab
                      data={filteredData}
                      months={months}
                      customerId={params.customerId}
                    />
                  )}
                  {activeTab === "benchmark" && (
                    <BenchmarkTab
                      data={filteredData}
                      months={months}
                      customerId={params.customerId}
                      allCustomers={customers}
                    />
                  )}
                </ErrorBoundary>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
