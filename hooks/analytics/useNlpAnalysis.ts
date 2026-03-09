"use client";
import { useMemo } from "react";
import type { AnalyticsData } from "@/types";
import { analyseTextRecords } from "@/lib/analytics/nlp";

export function useNlpAnalysis(data: AnalyticsData | null, months: string[]) {
  return useMemo(() => {
    if (!data?.raw_records?.length) return null;
    return analyseTextRecords(data.raw_records, months);
  }, [data, months]);
}
