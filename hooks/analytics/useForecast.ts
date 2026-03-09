"use client";
import { useMemo } from "react";
import type { AnalyticsData } from "@/types";
import { buildForecast } from "@/lib/analytics/forecast";

type Metric = "volume" | "sla" | "mttr" | "reopen";

const METRIC_FIELD: Record<Metric, string> = {
  volume: "Total",
  sla:    "SLA Met %",
  mttr:   "mttr",
  reopen: "reopen_rate",
};

export function useForecast(
  data: AnalyticsData | null,
  months: string[],
  metric: Metric,
  horizon: number,
  anomalyThreshold: number = 2.0
) {
  return useMemo(() => {
    if (!data) return [];

    const field = METRIC_FIELD[metric];
    let series: Array<{ month: string; value: number }>;

    if (metric === "volume") {
      series = (data.monthly_volume ?? [])
        .filter(r => months.includes(r.Month as string))
        .map(r => ({ month: r.Month as string, value: (r.Total as number) ?? 0 }));
    } else if (metric === "sla") {
      series = (data.monthly_sla ?? [])
        .filter(r => months.includes(r.month as string))
        .map(r => ({ month: r.month as string, value: (r["SLA Met %"] as number) ?? 0 }));
    } else {
      series = months.map(m => ({
        month: m,
        value: (data.dashboard as any)[field] ?? 0,
      }));
    }

    return buildForecast(series, horizon, anomalyThreshold);
  }, [data, months, metric, horizon, anomalyThreshold]);
}
