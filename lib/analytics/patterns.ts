import type { RawTicket } from "@/types";

export type SignalSeverity = "high" | "medium" | "low";

export interface PatternSignal {
  id: string;
  type: "velocity_surge" | "steady_climb" | "priority_escalation" | "concentrated_spike" | "keyword_surge";
  dimension: "Category" | "Resolver Group" | "Combined" | "Keyword";
  label: string;
  severity: SignalSeverity;
  confidence: number;
  slope: number;
  zScore: number;
  series: number[];
  months: string[];
  description: string;
}

interface Regression { m: number; b: number; r2: number }

function linRegression(pts: number[]): Regression {
  const n = pts.length;
  if (n < 2) return { m: 0, b: 0, r2: 0 };
  const xs = pts.map((_, i) => i);
  const sx = xs.reduce((a, v) => a + v, 0);
  const sy = pts.reduce((a, v) => a + v, 0);
  const sxy = xs.reduce((a, x, i) => a + x * pts[i]!, 0);
  const sxx = xs.reduce((a, x) => a + x * x, 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return { m: 0, b: 0, r2: 0 };
  const m = (n * sxy - sx * sy) / denom;
  const b = (sy - m * sx) / n;
  const yMean = sy / n;
  const ssTot = pts.reduce((a, y) => a + (y - yMean) ** 2, 0);
  const ssRes = pts.reduce((a, y, i) => a + (y - (m * i + b)) ** 2, 0);
  const r2    = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return { m, b, r2 };
}

function lastZScore(series: number[]): number {
  if (series.length < 3) return 0;
  const baseline = series.slice(0, -1);
  const mean = baseline.reduce((a, v) => a + v, 0) / baseline.length;
  const std  = Math.sqrt(baseline.reduce((a, v) => a + (v - mean) ** 2, 0) / baseline.length) || 1;
  return (series[series.length - 1]! - mean) / std;
}

export function detectPatterns(
  rawRecords: RawTicket[],
  months: string[]
): PatternSignal[] {
  if (months.length < 3) return [];
  const signals: PatternSignal[] = [];
  let id = 0;

  // Build volume by category × month
  const categories = [...new Set(rawRecords.map(r => r.category).filter(Boolean))];
  const groups     = [...new Set(rawRecords.map(r => r.assignment_group).filter(Boolean))];

  for (const cat of categories) {
    const series = months.map(m =>
      rawRecords.filter(r => r.category === cat && (r.sys_created_on ?? "").startsWith(m)).length
    );

    const z   = lastZScore(series);
    const reg = linRegression(series);

    // Velocity surge
    if (z >= 1.5) {
      const sev: SignalSeverity = z >= 2.5 ? "high" : z >= 2.0 ? "medium" : "low";
      signals.push({
        id:          `sig-${++id}`,
        type:        "velocity_surge",
        dimension:   "Category",
        label:       cat,
        severity:    sev,
        confidence:  Math.min(99, Math.round(60 + z * 15)),
        slope:       Math.round(reg.m * 10) / 10,
        zScore:      Math.round(z * 100) / 100,
        series,
        months,
        description: `${cat} ticket volume spiked ${Math.round(z * 10) / 10}σ above baseline in the most recent month.`,
      });
    }

    // Steady climb
    if (reg.r2 >= 0.65 && reg.m > 0.5) {
      signals.push({
        id:          `sig-${++id}`,
        type:        "steady_climb",
        dimension:   "Category",
        label:       cat,
        severity:    reg.m > 3 ? "high" : reg.m > 1.5 ? "medium" : "low",
        confidence:  Math.min(99, Math.round(reg.r2 * 100)),
        slope:       Math.round(reg.m * 10) / 10,
        zScore:      Math.round(z * 100) / 100,
        series,
        months,
        description: `${cat} shows a consistent upward trend of +${Math.round(reg.m * 10) / 10} tickets/month (R²=${Math.round(reg.r2 * 100)}%).`,
      });
    }
  }

  // Priority escalation — rising Crit/High ratio per group
  for (const grp of groups) {
    const critHighSeries = months.map(m => {
      const gm = rawRecords.filter(r => r.assignment_group === grp && (r.sys_created_on ?? "").startsWith(m));
      const critHigh = gm.filter(r => /^[12]/.test(r.priority ?? "")).length;
      return gm.length > 0 ? critHigh / gm.length : 0;
    });
    const reg = linRegression(critHighSeries);
    if (reg.r2 >= 0.65 && reg.m > 0.02) {
      signals.push({
        id:          `sig-${++id}`,
        type:        "priority_escalation",
        dimension:   "Resolver Group",
        label:       grp,
        severity:    reg.m > 0.06 ? "high" : "medium",
        confidence:  Math.min(99, Math.round(reg.r2 * 100)),
        slope:       Math.round(reg.m * 1000) / 10,
        zScore:      lastZScore(critHighSeries),
        series:      critHighSeries.map(v => Math.round(v * 100)),
        months,
        description: `${grp} is seeing an increasing proportion of Critical/High tickets.`,
      });
    }
  }

  return signals
    .sort((a, b) => {
      const sevOrder = { high: 0, medium: 1, low: 2 };
      const ds = sevOrder[a.severity] - sevOrder[b.severity];
      return ds !== 0 ? ds : b.zScore - a.zScore;
    })
    .slice(0, 20);
}

export function detectKeywordSpikes(
  kwByMonth: Record<string, Array<{ word: string; count: number }>>,
  months: string[]
): PatternSignal[] {
  if (months.length < 3) return [];
  const signals: PatternSignal[] = [];
  let id = 0;

  // Collect all unique words
  const allWords = new Set<string>();
  Object.values(kwByMonth).forEach(entries => entries.forEach(e => allWords.add(e.word)));

  for (const word of allWords) {
    const series = months.map(m => {
      const entry = kwByMonth[m]?.find(e => e.word === word);
      return entry?.count ?? 0;
    });
    if (series.every(v => v === 0)) continue;

    const z = lastZScore(series);
    if (z >= 1.8) {
      signals.push({
        id:          `kw-${++id}`,
        type:        "keyword_surge",
        dimension:   "Keyword",
        label:       word,
        severity:    z >= 2.5 ? "high" : "medium",
        confidence:  Math.min(99, Math.round(60 + z * 12)),
        slope:       0,
        zScore:      Math.round(z * 100) / 100,
        series,
        months,
        description: `Keyword "${word}" appeared ${Math.round(z * 10) / 10}σ more frequently than baseline.`,
      });
    }
  }

  return signals.slice(0, 8);
}
