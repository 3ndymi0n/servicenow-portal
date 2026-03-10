/**
 * SLA_THRESHOLDS
 *
 * Shared resolution time limits (in hours) per priority level.
 * Used in SLA compliance calculations across TechnicianStatsModal,
 * MyPerformancePage, and any other place that needs to evaluate
 * whether a ticket was resolved within SLA.
 *
 * ── FIX (MEDIUM): Previously these constants were duplicated verbatim in
 *    TechnicianStatsModal.tsx and my-performance/page.tsx. A single source
 *    of truth prevents silent inconsistencies if SLA tiers ever change.
 */
export const SLA_THRESHOLDS: Record<string, number> = {
  "1 - critical": 4,
  "2 - high":     8,
  "3 - moderate": 24,
  "4 - low":      72,
};

/** Default SLA limit (hours) when priority is missing or unrecognised. */
export const SLA_DEFAULT_HOURS = 24;

/**
 * Returns true when the ticket's elapsed time from creation to update
 * falls within the SLA threshold for its priority.
 */
export function isWithinSla(
  createdOn: string | undefined | null,
  updatedOn: string | undefined | null,
  priority:  string | undefined | null,
): boolean {
  const created = new Date(createdOn || 0).getTime();
  const updated = new Date(updatedOn || createdOn || 0).getTime();
  const hours   = (updated - created) / 3_600_000;
  const limit   = SLA_THRESHOLDS[(priority ?? "").toLowerCase()] ?? SLA_DEFAULT_HOURS;
  return hours > 0 && hours <= limit;
}
