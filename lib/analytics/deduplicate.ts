import type { RawTicket } from "@/types";

export interface DeduplicateStats {
  added: number;
  updated: number;
  skipped: number;
  noDate: number;
  total: number;
}

export interface DeduplicateResult {
  merged: RawTicket[];
  stats: DeduplicateStats;
  details: {
    added:   RawTicket[];
    updated: RawTicket[];
    skipped: RawTicket[];
    noDate:  RawTicket[];
  };
}

/**
 * Merges incoming records into existing records.
 * Rules:
 * - Match on ticket number (case-insensitive)
 * - If incoming has a newer sys_updated_on → replace (updated)
 * - If existing is newer or equal → skip (skipped)
 * - If incoming has no date → noDate (still added if not already present)
 * - New ticket numbers → added
 */
export function deduplicateRecords(
  existing: RawTicket[],
  incoming: RawTicket[]
): DeduplicateResult {
  const existingMap = new Map<string, RawTicket>();
  for (const r of existing) {
    existingMap.set(r.number.toLowerCase(), r);
  }

  const added:   RawTicket[] = [];
  const updated: RawTicket[] = [];
  const skipped: RawTicket[] = [];
  const noDate:  RawTicket[] = [];

  for (const r of incoming) {
    const key = r.number.toLowerCase();
    const prev = existingMap.get(key);

    if (!prev) {
      // New ticket
      if (!r.sys_updated_on && !r.sys_created_on) {
        noDate.push(r);
      }
      existingMap.set(key, r);
      added.push(r);
      continue;
    }

    // Existing ticket — compare dates
    if (!r.sys_updated_on && !r.sys_created_on) {
      noDate.push(r);
      skipped.push(r);
      continue;
    }

    const incomingDate = new Date(r.sys_updated_on || r.sys_created_on).getTime();
    const existingDate = new Date(prev.sys_updated_on || prev.sys_created_on || 0).getTime();

    if (incomingDate > existingDate) {
      existingMap.set(key, r);
      updated.push(r);
    } else {
      skipped.push(r);
    }
  }

  const merged = Array.from(existingMap.values());

  return {
    merged,
    stats: {
      added:   added.length,
      updated: updated.length,
      skipped: skipped.length,
      noDate:  noDate.length,
      total:   merged.length,
    },
    details: { added, updated, skipped, noDate },
  };
}
