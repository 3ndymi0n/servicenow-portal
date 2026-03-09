import { describe, it, expect } from "vitest";
import { linReg, zScore, buildForecast } from "@/lib/analytics/forecast";

describe("linReg", () => {
  it("returns null for fewer than 2 points", () => {
    expect(linReg([{ x:0, y:10 }])).toBeNull();
    expect(linReg([])).toBeNull();
  });

  it("finds perfect linear fit", () => {
    const pts = [0,1,2,3,4].map(x => ({ x, y: 2*x + 5 }));
    const reg = linReg(pts)!;
    expect(reg.m).toBeCloseTo(2);
    expect(reg.b).toBeCloseTo(5);
    expect(reg.predict(10)).toBeCloseTo(25);
  });

  it("handles flat series", () => {
    const pts = [0,1,2,3].map(x => ({ x, y: 42 }));
    const reg = linReg(pts)!;
    expect(reg.m).toBeCloseTo(0, 5);
    expect(reg.predict(99)).toBeCloseTo(42);
  });
});

describe("zScore", () => {
  it("returns all zeros for constant series", () => {
    const zs = zScore([5, 5, 5, 5]);
    zs.forEach(z => expect(z).toBe(0));
  });

  it("flags extreme value with high z-score", () => {
    const zs = zScore([10, 10, 10, 10, 100]);
    expect(Math.abs(zs[zs.length - 1]!)).toBeGreaterThan(1.5);
  });

  it("returns zeros for series shorter than 3", () => {
    expect(zScore([5, 10])).toEqual([0, 0]);
  });
});

describe("buildForecast", () => {
  const series = [
    { month:"2025-01", value:100 },
    { month:"2025-02", value:110 },
    { month:"2025-03", value:120 },
    { month:"2025-04", value:130 },
    { month:"2025-05", value:140 },
  ];

  it("returns empty for fewer than 2 points", () => {
    expect(buildForecast([{ month:"2025-01", value:100 }], 3)).toHaveLength(0);
  });

  it("appends correct number of future points", () => {
    const result = buildForecast(series, 3);
    const future = result.filter(p => p.actual === null);
    expect(future).toHaveLength(3);
  });

  it("future points have null actual", () => {
    const result = buildForecast(series, 2);
    result.filter(p => p.actual === null).forEach(p => {
      expect(p.actual).toBeNull();
      expect(p.forecast).toBeGreaterThan(0);
    });
  });

  it("generates correct future months", () => {
    const result = buildForecast(series, 3);
    const future = result.filter(p => p.actual === null).map(p => p.month);
    expect(future).toEqual(["2025-06","2025-07","2025-08"]);
  });

  it("flags anomaly when z-score exceeds threshold", () => {
    const seriesWithSpike = [
      ...series.slice(0,-1),
      { month:"2025-05", value:500 },
    ];
    const result = buildForecast(seriesWithSpike, 0, 1.5);
    const anomalies = result.filter(p => p.isAnomaly);
    expect(anomalies.length).toBeGreaterThan(0);
  });

  it("confidence interval is lower ≤ forecast ≤ upper", () => {
    buildForecast(series, 3).forEach(p => {
      expect(p.lower).toBeLessThanOrEqual(p.forecast);
      expect(p.upper).toBeGreaterThanOrEqual(p.forecast);
    });
  });
});
