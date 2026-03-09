export interface Point { x: number; y: number }
export interface Regression { m: number; b: number; predict: (x: number) => number }

export function linReg(pts: Point[]): Regression | null {
  const n = pts.length;
  if (n < 2) return null;
  const sx  = pts.reduce((a, p) => a + p.x, 0);
  const sy  = pts.reduce((a, p) => a + p.y, 0);
  const sxy = pts.reduce((a, p) => a + p.x * p.y, 0);
  const sxx = pts.reduce((a, p) => a + p.x * p.x, 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const m = (n * sxy - sx * sy) / denom;
  const b = (sy - m * sx) / n;
  return { m, b, predict: (x) => m * x + b };
}

/** Z-scores for a series of values. */
export function zScore(vals: number[]): number[] {
  const n = vals.length;
  if (n < 3) return vals.map(() => 0);
  const mean = vals.reduce((a, v) => a + v, 0) / n;
  const std  = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / n) || 1;
  return vals.map(v => (v - mean) / std);
}

export interface ForecastPoint {
  month: string;
  actual: number | null;
  forecast: number;
  lower: number;
  upper: number;
  isAnomaly: boolean;
  zScore: number;
}

/**
 * Build a forecast with confidence intervals and anomaly flags.
 * @param series - Array of { month, value } historical points
 * @param horizon - Number of future months to forecast
 * @param anomalyThreshold - Z-score threshold to flag anomalies
 */
export function buildForecast(
  series: Array<{ month: string; value: number }>,
  horizon: number,
  anomalyThreshold: number = 2.0
): ForecastPoint[] {
  if (series.length < 2) return [];

  const pts = series.map((s, i) => ({ x: i, y: s.value }));
  const reg = linReg(pts);
  if (!reg) return [];

  const zScores = zScore(series.map(s => s.value));
  const residuals = series.map((s, i) => s.value - reg.predict(i));
  const stdResid  = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length) || 1;

  // Historical points
  const result: ForecastPoint[] = series.map((s, i) => ({
    month:     s.month,
    actual:    s.value,
    forecast:  Math.max(0, Math.round(reg.predict(i))),
    lower:     Math.max(0, Math.round(reg.predict(i) - 1.96 * stdResid)),
    upper:     Math.round(reg.predict(i) + 1.96 * stdResid),
    isAnomaly: Math.abs(zScores[i]!) > anomalyThreshold,
    zScore:    Math.round(zScores[i]! * 100) / 100,
  }));

  // Future forecasts — extend month strings
  const lastMonth = series[series.length - 1]!.month;
  let [year, month] = lastMonth.split("-").map(Number) as [number, number];
  for (let h = 1; h <= horizon; h++) {
    month++;
    if (month > 12) { month = 1; year++; }
    const forecastVal = Math.max(0, Math.round(reg.predict(series.length - 1 + h)));
    result.push({
      month:     `${year}-${String(month).padStart(2, "0")}`,
      actual:    null,
      forecast:  forecastVal,
      lower:     Math.max(0, Math.round(forecastVal - 1.96 * stdResid)),
      upper:     Math.round(forecastVal + 1.96 * stdResid),
      isAnomaly: false,
      zScore:    0,
    });
  }

  return result;
}
