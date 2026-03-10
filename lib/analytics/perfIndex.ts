/**
 * calcPerfIndex
 *
 * Calculates the standardised 0–100 Performance Index using the same
 * weighting as the Technicians tab:
 *
 *   40% SLA Met %
 *   25% FCR %
 *   20% Reopen Rate % (inverted — lower is better)
 *   15% Reassign Rate % (inverted — lower is better)
 *
 * Pass `null` for any metric that is unavailable at the call site.
 * Missing inputs fall back to a neutral 50 score so the overall index
 * is honest about uncertainty rather than artificially inflating results.
 *
 * ── FIX (HIGH): Centralises the performance index calculation so that
 *    TechniciansTab and MyPerformancePage produce consistent scores for
 *    the same technician. Previously, MyPerformancePage used a different
 *    formula with a hardcoded constant (65 × 0.35) that inflated every
 *    score by ~23 points.
 */
export interface PerfInputs {
  slaPct:      number | null;
  fcrPct:      number | null;
  reopenPct:   number | null;
  reassignPct: number | null;
}

const NEUTRAL = 50;

export function calcPerfIndex({
  slaPct,
  fcrPct,
  reopenPct,
  reassignPct,
}: PerfInputs): number {
  const sla      = slaPct      ?? NEUTRAL;
  const fcr      = fcrPct      ?? NEUTRAL;
  // For inverted metrics: a 0% reopen/reassign rate → 100 score; 100% → 0 score.
  const reopen   = reopenPct   != null ? Math.max(0, 100 - reopenPct)   : NEUTRAL;
  const reassign = reassignPct != null ? Math.max(0, 100 - reassignPct) : NEUTRAL;

  return Math.round(sla * 0.40 + fcr * 0.25 + reopen * 0.20 + reassign * 0.15);
}
