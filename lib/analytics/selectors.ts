import type { AnalyticsData, TechnicianStats, GroupStats, RawTicket } from "@/types";
import { CLOSED_STATES } from "./constants";
import { monthRatio } from "./dateFilter";
import { r1 } from "./kpi";

/** Scale an entire technician row's count fields by a date-filter ratio. */
export function scaleTechnicianRow(t: TechnicianStats, ratio: number): TechnicianStats {
  return {
    ...t,
    Total:             Math.round(t.Total * ratio),
    Incidents:         Math.round(t.Incidents * ratio),
    "Catalog Tasks":   Math.round(t["Catalog Tasks"] * ratio),
    Reassigned:        Math.round(t.Reassigned * ratio),
    Reopened:          Math.round(t.Reopened * ratio),
  };
}

/** Scale group stats by ratio. */
export function scaleGroupRow(g: GroupStats, ratio: number): GroupStats {
  return {
    ...g,
    Total:           Math.round(g.Total * ratio),
    Incidents:       Math.round(g.Incidents * ratio),
    "Catalog Tasks": Math.round(g["Catalog Tasks"] * ratio),
    Resolved:        Math.round(g.Resolved * ratio),
    Escalations:     Math.round(g.Escalations * ratio),
  };
}

/** Filter a groups array by an allowedGroups restriction (null = all). */
export function filterGroupRows<T extends { Group?: string; assignment_group?: string }>(
  arr: T[],
  allowedGroups: string[] | null,
  key: "Group" | "assignment_group" = "Group"
): T[] {
  if (!allowedGroups) return arr;
  return arr.filter(r => allowedGroups.includes((r[key] as string) ?? ""));
}

/** Build the tickets-over-time dataset for the Technicians tab line chart. */
export function buildTechTrendData(
  data: AnalyticsData | null,
  months: string[],
  topN: number
): { months: string[]; series: string[]; rows: Array<Record<string, number | string>> } {
  if (!data?.raw_records?.length || months.length < 2) {
    return { months: [], series: [], rows: [] };
  }

  const raw = data.raw_records;

  // Build closed-count per technician from raw records
  const closedByTech = new Map<string, number>();
  for (const r of raw) {
    if (!r.assigned_to?.trim()) continue;
    if (!CLOSED_STATES.has((r.state ?? "").toLowerCase().trim())) continue;
    const name = r.assigned_to.trim();
    closedByTech.set(name, (closedByTech.get(name) ?? 0) + 1);
  }

  const topTechs = [...closedByTech.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name]) => name);

  if (!topTechs.length) return { months, series: [], rows: [] };

  // Count per tech per month
  const counts: Record<string, Record<string, number>> = {};
  months.forEach(m => { counts[m] = {}; });

  for (const r of raw) {
    const tech = r.assigned_to?.trim();
    if (!tech || !topTechs.includes(tech)) continue;
    if (!CLOSED_STATES.has((r.state ?? "").toLowerCase().trim())) continue;
    const month = (r.sys_updated_on || r.sys_created_on || "").slice(0, 7);
    if (!months.includes(month)) continue;
    counts[month]![tech] = (counts[month]![tech] ?? 0) + 1;
  }

  const rows = months.map(m => {
    const row: Record<string, number | string> = { month: m };
    topTechs.forEach(tech => { row[tech] = counts[m]?.[tech] ?? 0; });
    return row;
  });

  return { months, series: topTechs, rows };
}

/** Workload histogram buckets for the Technicians tab. */
export function buildHistogram(
  technicians: TechnicianStats[]
): Array<{ label: string; count: number }> {
  const buckets = [
    { label: "1–10",   min: 1,   max: 10,       count: 0 },
    { label: "11–25",  min: 11,  max: 25,        count: 0 },
    { label: "26–50",  min: 26,  max: 50,        count: 0 },
    { label: "51–100", min: 51,  max: 100,       count: 0 },
    { label: "100+",   min: 101, max: Infinity,  count: 0 },
  ];
  for (const t of technicians) {
    const bucket = buckets.find(b => t.Total >= b.min && t.Total <= b.max);
    if (bucket) bucket.count++;
  }
  return buckets;
}

/** Median vs avg resolution gap data. */
export function buildMedianAvgGap(
  technicians: TechnicianStats[]
): Array<{ name: string; avg: number; median: number; gap: number }> {
  return technicians
    .filter(t => typeof t["Avg Res (hrs)"] === "number" && typeof t["Median Res (hrs)"] === "number")
    .map(t => ({
      name:   t.Technician,
      avg:    t["Avg Res (hrs)"],
      median: t["Median Res (hrs)"],
      gap:    r1(t["Avg Res (hrs)"] - t["Median Res (hrs)"]),
    }))
    .sort((a, b) => b.gap - a.gap);
}
