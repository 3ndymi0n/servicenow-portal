import type { RawTicket, AnalyticsData } from "@/types";
import { DEFAULT_MONTHS } from "./constants";

/** Extract sorted unique YYYY-MM strings from a data payload. */
export function getDataMonths(data: AnalyticsData | null): string[] {
  if (!data?.monthly_volume?.length) return [...DEFAULT_MONTHS];
  return data.monthly_volume
    .map(r => r.Month as string)
    .filter(Boolean)
    .sort();
}

/** All YYYY-MM strings between from and to inclusive. */
export function monthRange(from: string, to: string): string[] {
  const result: string[] = [];
  const [fromY, fromM] = from.split("-").map(Number);
  const [toY, toM]     = to.split("-").map(Number);
  let year = fromY!, month = fromM!;
  while (year < toY! || (year === toY! && month <= toM!)) {
    result.push(`${year}-${String(month).padStart(2, "0")}`);
    month++;
    if (month > 12) { month = 1; year++; }
  }
  return result;
}

/** Filter raw records to those within the given month range. */
export function filterByMonthRange(
  records: RawTicket[],
  from: string,
  to: string
): RawTicket[] {
  const months = new Set(monthRange(from, to));
  return records.filter(r => {
    const m = (r.sys_created_on ?? "").slice(0, 7);
    return months.has(m);
  });
}

/** Given from/to date strings and available data months, produce filtered month list. */
export function resolveMonthsInRange(
  dataMonths: string[],
  from: string,
  to: string
): string[] {
  const range = new Set(monthRange(from, to));
  return dataMonths.filter(m => range.has(m));
}

/** Ratio of selected months to total data months (for scaling aggregated stats). */
export function monthRatio(selectedMonths: string[], dataMonths: string[]): number {
  if (!dataMonths.length) return 1;
  return selectedMonths.length / dataMonths.length;
}
