"use client";
import { useMemo } from "react";
import type { AnalyticsData } from "@/types";
import { buildTechTrendData } from "@/lib/analytics/selectors";

export function useTechTrend(
  data: AnalyticsData | null,
  months: string[],
  topN: number
) {
  return useMemo(
    () => buildTechTrendData(data, months, topN),
    [data, months, topN]
  );
}
