"use client";
import { useMemo } from "react";
import type { AnalyticsData } from "@/types";
import { detectPatterns, detectKeywordSpikes } from "@/lib/analytics/patterns";
import { analyseTextRecords } from "@/lib/analytics/nlp";

export function usePatterns(data: AnalyticsData | null, months: string[]) {
  const signals = useMemo(() => {
    if (!data?.raw_records?.length) return [];
    return detectPatterns(data.raw_records, months);
  }, [data, months]);

  const keywordSignals = useMemo(() => {
    if (!data?.raw_records?.length) return [];
    const nlp = analyseTextRecords(data.raw_records, months);
    return detectKeywordSpikes(nlp.kwByMonth, months);
  }, [data, months]);

  return { signals, keywordSignals, allSignals: [...signals, ...keywordSignals] };
}
