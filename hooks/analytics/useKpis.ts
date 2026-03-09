"use client";
import { useMemo } from "react";
import type { AnalyticsData } from "@/types";
import { monthRatio } from "@/lib/analytics/dateFilter";
import { r1 } from "@/lib/analytics/kpi";

export function useKpis(data: AnalyticsData | null, selectedMonths: string[], dataMonths: string[]) {
  return useMemo(() => {
    if (!data) return null;
    const ratio  = monthRatio(selectedMonths, dataMonths);
    const kv     = data.dashboard;

    return {
      totalInc:    Math.round(kv.total_inc * ratio),
      totalCat:    Math.round(kv.total_cat * ratio),
      total:       Math.round(kv.total * ratio),
      mttr:        kv.mttr,
      medianTtr:   kv.median_ttr,
      slaMet:      kv.sla_met,
      slaBreach:   kv.sla_breach,
      critHigh:    Math.round(kv.crit_high * ratio),
      critPct:     kv.crit_pct,
      reopen:      Math.round(kv.reopen * ratio),
      reassign:    Math.round(kv.reassign * ratio),
      reopenRate:  kv.reopen_rate,
      reassignRate:kv.reassign_rate,
      groups:      kv.groups,
      techs:       kv.techs,
      ratio,
    };
  }, [data, selectedMonths, dataMonths]);
}
