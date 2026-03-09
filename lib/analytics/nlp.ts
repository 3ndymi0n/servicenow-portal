import type { RawTicket } from "@/types";

const STOP_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","by","from",
  "as","is","was","are","were","be","been","being","have","has","had","do","does","did",
  "will","would","could","should","may","might","can","this","that","these","those",
  "i","you","he","she","it","we","they","what","which","who","how","when","where","why",
  "not","no","yes","all","each","some","any","more","most","other","than","then","just",
  "also","only","its","their","our","your","my","his","her","into","out","up","down",
  "after","before","between","through","during","about","against","over","under",
]);

const ERROR_TERMS = [
  "error","locked","corrupt","missing","failure","failed","crash","exceeded",
  "expired","unreachable","denied","timeout","unavailable","broken","invalid","refused",
];

const RESOLVE_TERMS = [
  "resolved","cleared","reset","updated","rollback","escalated","restarted",
  "reinstalled","patched","replaced","reconfigured","fixed","closed","workaround",
];

export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length >= 3 && !STOP_WORDS.has(t));
}

export interface NlpResult {
  top_keywords: Array<{ word: string; count: number }>;
  error_counts: Array<{ term: string; count: number }>;
  res_counts:   Array<{ action: string; count: number }>;
  cat_keywords: Record<string, Array<{ word: string; count: number }>>;
  rc_counts:    Array<{ name: string; value: number }>;
  rc_by_cat:    Record<string, Array<{ root_cause_category: string; count: number }>>;
  phase_dist:   Array<{ phase: string; count: number }>;
  sentiment_dist: Array<{ sentiment: string; count: number }>;
  repeat_issues: Array<{ caller_id: string; subcategory: string; count: number }>;
  kwByMonth:    Record<string, Array<{ word: string; count: number }>>;
  escalationCount: number;
  totalAnalysed: number;
  hasText: boolean;
}

export function analyseTextRecords(
  rawRecords: RawTicket[],
  rangeMonths: string[]
): NlpResult {
  const records = rangeMonths.length
    ? rawRecords.filter(r => rangeMonths.includes((r.sys_created_on ?? "").slice(0, 7)))
    : rawRecords;

  const hasText = records.some(r => r.short_description || r.work_notes);
  if (!hasText) {
    return emptyNlpResult(records.length);
  }

  const wordFreq  = new Map<string, number>();
  const catWords  = new Map<string, Map<string, number>>();
  const errorFreq = new Map<string, number>(ERROR_TERMS.map(t => [t, 0]));
  const resFreq   = new Map<string, number>(RESOLVE_TERMS.map(t => [t, 0]));
  const rcFreq    = new Map<string, number>();
  const rcByCat   = new Map<string, Map<string, number>>();
  const phaseFreq = new Map<string, number>();
  const sentFreq  = new Map<string, number>();
  let escalations = 0;

  const kwByMonth: Record<string, Map<string, number>> = {};
  rangeMonths.forEach(m => { kwByMonth[m] = new Map(); });

  for (const r of records) {
    const text = [r.short_description, r.work_notes].filter(Boolean).join(" ");
    const tokens = tokenise(text);
    const cat = r.category ?? "Unknown";
    const month = (r.sys_created_on ?? "").slice(0, 7);

    // Global word frequency
    for (const t of tokens) {
      wordFreq.set(t, (wordFreq.get(t) ?? 0) + 1);
      if (month && kwByMonth[month]) {
        const mMap = kwByMonth[month]!;
        mMap.set(t, (mMap.get(t) ?? 0) + 1);
      }
    }

    // Category-level words
    if (!catWords.has(cat)) catWords.set(cat, new Map());
    const cMap = catWords.get(cat)!;
    tokens.forEach(t => cMap.set(t, (cMap.get(t) ?? 0) + 1));

    // Error signals
    for (const et of ERROR_TERMS) {
      if (text.toLowerCase().includes(et)) errorFreq.set(et, (errorFreq.get(et) ?? 0) + 1);
    }
    // Resolution actions
    for (const rt of RESOLVE_TERMS) {
      if (text.toLowerCase().includes(rt)) resFreq.set(rt, (resFreq.get(rt) ?? 0) + 1);
    }

    // Escalation detection
    if (/escalat|urgent|critical|executive/i.test(r.work_notes ?? "")) escalations++;

    // Phase / sentiment from enriched data
    if (r._phase) phaseFreq.set(r._phase, (phaseFreq.get(r._phase) ?? 0) + 1);
    if (r._sentiment) sentFreq.set(r._sentiment, (sentFreq.get(r._sentiment) ?? 0) + 1);

    // Root cause approximation
    const rcKey = inferRootCause(text);
    rcFreq.set(rcKey, (rcFreq.get(rcKey) ?? 0) + 1);
    if (!rcByCat.has(cat)) rcByCat.set(cat, new Map());
    const rcMap = rcByCat.get(cat)!;
    rcMap.set(rcKey, (rcMap.get(rcKey) ?? 0) + 1);
  }

  const top_keywords = [...wordFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));

  const cat_keywords: Record<string, Array<{ word: string; count: number }>> = {};
  for (const [cat, wm] of catWords) {
    cat_keywords[cat] = [...wm.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
  }

  const kwByMonthResult: Record<string, Array<{ word: string; count: number }>> = {};
  for (const [m, wm] of Object.entries(kwByMonth)) {
    kwByMonthResult[m] = [...(wm as Map<string, number>).entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word, count]) => ({ word, count }));
  }

  const rc_by_cat: Record<string, Array<{ root_cause_category: string; count: number }>> = {};
  for (const [cat, rcm] of rcByCat) {
    rc_by_cat[cat] = [...rcm.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([root_cause_category, count]) => ({ root_cause_category, count }));
  }

  // Repeat issues: category + RC combos appearing 3+ times
  const pairFreq = new Map<string, { caller_id: string; subcategory: string; count: number }>();
  for (const [cat, rcm] of rcByCat) {
    for (const [rc, cnt] of rcm) {
      if (cnt >= 3) {
        const key = `${cat}::${rc}`;
        pairFreq.set(key, { caller_id: cat, subcategory: rc, count: cnt });
      }
    }
  }

  return {
    top_keywords,
    error_counts:  ERROR_TERMS.map(term => ({ term, count: errorFreq.get(term) ?? 0 })),
    res_counts:    RESOLVE_TERMS.map(action => ({ action, count: resFreq.get(action) ?? 0 })),
    cat_keywords,
    rc_counts:     [...rcFreq.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value })),
    rc_by_cat,
    phase_dist:    [...phaseFreq.entries()].map(([phase, count]) => ({ phase, count })),
    sentiment_dist:[...sentFreq.entries()].map(([sentiment, count]) => ({ sentiment, count })),
    repeat_issues: [...pairFreq.values()].sort((a, b) => b.count - a.count),
    kwByMonth:     kwByMonthResult,
    escalationCount: escalations,
    totalAnalysed:   records.length,
    hasText:         true,
  };
}

function inferRootCause(text: string): string {
  const t = text.toLowerCase();
  if (/config|setting|parameter|misconfigur/.test(t))  return "Configuration Error";
  if (/user error|accidental|wrong button|mistype/.test(t)) return "User Error";
  if (/account|password|lockout|credential/.test(t))   return "Account / Access Issue";
  if (/disk|storage|memory|capacity|quota/.test(t))    return "Capacity Issue";
  if (/driver|firmware|software update/.test(t))       return "Driver Issue";
  if (/corrupt|corrupted/.test(t))                     return "Corruption";
  if (/network|connectivity|connection|vpn/.test(t))   return "Network Issue";
  if (/hardware|device|printer|peripheral/.test(t))    return "Hardware Failure";
  return "Unknown / Other";
}

function emptyNlpResult(totalAnalysed: number): NlpResult {
  return {
    top_keywords:    [],
    error_counts:    ERROR_TERMS.map(term => ({ term, count: 0 })),
    res_counts:      RESOLVE_TERMS.map(action => ({ action, count: 0 })),
    cat_keywords:    {},
    rc_counts:       [],
    rc_by_cat:       {},
    phase_dist:      [],
    sentiment_dist:  [],
    repeat_issues:   [],
    kwByMonth:       {},
    escalationCount: 0,
    totalAnalysed,
    hasText:         false,
  };
}
