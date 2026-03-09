import { describe, it, expect } from "vitest";
import { monthRange, filterByMonthRange, resolveMonthsInRange, monthRatio } from "@/lib/analytics/dateFilter";
import type { RawTicket } from "@/types";

describe("monthRange", () => {
  it("returns a single month when from === to", () => {
    expect(monthRange("2025-01", "2025-01")).toEqual(["2025-01"]);
  });

  it("returns correct sequence within a year", () => {
    expect(monthRange("2025-01", "2025-03")).toEqual(["2025-01","2025-02","2025-03"]);
  });

  it("wraps correctly across year boundary", () => {
    const range = monthRange("2024-11", "2025-02");
    expect(range).toEqual(["2024-11","2024-12","2025-01","2025-02"]);
  });

  it("returns empty when from > to (caller responsibility)", () => {
    const range = monthRange("2025-03", "2025-01");
    expect(range).toHaveLength(0);
  });
});

describe("filterByMonthRange", () => {
  const makeTicket = (created: string): RawTicket => ({
    number: "INC001", type: "Incident", category: "Network",
    priority: "3 - Moderate", assignment_group: "Service Desk",
    assigned_to: "Alice", state: "Closed",
    sys_created_on: created, sys_updated_on: created,
  });

  it("filters to only months in range", () => {
    const records = [
      makeTicket("2025-01-15"),
      makeTicket("2025-02-10"),
      makeTicket("2025-03-20"),
    ];
    const filtered = filterByMonthRange(records, "2025-01", "2025-02");
    expect(filtered).toHaveLength(2);
    expect(filtered.every(r => ["2025-01","2025-02"].includes(r.sys_created_on.slice(0,7)))).toBe(true);
  });

  it("returns empty array when no records match", () => {
    const records = [makeTicket("2024-06-01")];
    expect(filterByMonthRange(records, "2025-01", "2025-03")).toHaveLength(0);
  });
});

describe("resolveMonthsInRange", () => {
  it("returns only the intersection of data months and range", () => {
    const dataMonths = ["2025-01","2025-02","2025-03","2025-04"];
    const result = resolveMonthsInRange(dataMonths, "2025-02", "2025-03");
    expect(result).toEqual(["2025-02","2025-03"]);
  });
});

describe("monthRatio", () => {
  it("returns 1 when selected equals total", () => {
    expect(monthRatio(["2025-01","2025-02","2025-03"], ["2025-01","2025-02","2025-03"])).toBe(1);
  });

  it("returns correct fraction", () => {
    expect(monthRatio(["2025-01","2025-02"], ["2025-01","2025-02","2025-03","2025-04"])).toBeCloseTo(0.5);
  });

  it("returns 1 when dataMonths is empty (safety)", () => {
    expect(monthRatio([], [])).toBe(1);
  });
});
