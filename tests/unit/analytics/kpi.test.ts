import { describe, it, expect } from "vitest";
import { perfIndex, isClosed, r1, deriveTechnicianStats } from "@/lib/analytics/kpi";
import type { RawTicket } from "@/types";

describe("perfIndex", () => {
  it("returns 100 for perfect scores", () => {
    expect(perfIndex(100, 100, 0, 0)).toBe(100);
  });

  it("returns 0 for worst scores", () => {
    expect(perfIndex(0, 0, 100, 100)).toBe(0);
  });

  it("applies correct weights: 40/25/20/15", () => {
    // Only SLA=100, rest 0 → 40
    expect(perfIndex(100, 0, 0, 0)).toBe(40);
    // Only FCR=100 → 25
    expect(perfIndex(0, 100, 0, 0)).toBe(25);
    // Reopen 0 → contributes (100-0)*0.20 = 20
    expect(perfIndex(0, 0, 0, 0)).toBe(35); // (100-0)*0.20 + (100-0)*0.15 = 35
  });

  it("clamps between 0 and 100", () => {
    expect(perfIndex(200, 200, -100, -100)).toBe(100);
    expect(perfIndex(-50, -50, 200, 200)).toBe(0);
  });
});

describe("isClosed", () => {
  it.each([
    ["Closed", true],
    ["closed", true],
    ["Resolved", true],
    ["RESOLVED", true],
    ["Complete", true],
    ["Closed Complete", true],
    ["In Progress", false],
    ["On Hold", false],
    ["Open", false],
    ["", false],
  ])("state %s → %s", (state, expected) => {
    expect(isClosed({ state } as RawTicket)).toBe(expected);
  });
});

describe("r1", () => {
  it("rounds to 1 decimal", () => {
    expect(r1(3.14159)).toBe(3.1);
    expect(r1(2.95)).toBe(3);
    expect(r1(0)).toBe(0);
  });
});

describe("deriveTechnicianStats", () => {
  const mkTicket = (o: Partial<RawTicket>): RawTicket => ({
    number: "INC001", type: "Incident", category: "Network",
    priority: "3 - Moderate", assignment_group: "Service Desk",
    assigned_to: "Alice", state: "Closed",
    sys_created_on: "2025-01-01 08:00:00",
    sys_updated_on: "2025-01-01 12:00:00",
    ...o,
  });

  it("groups by assigned_to", () => {
    const records = [
      mkTicket({ assigned_to: "Alice" }),
      mkTicket({ assigned_to: "Alice", number: "INC002" }),
      mkTicket({ assigned_to: "Bob",   number: "INC003" }),
    ];
    const stats = deriveTechnicianStats(records);
    expect(stats).toHaveLength(2);
    const alice = stats.find(s => s.Technician === "Alice");
    expect(alice?.Total).toBe(2);
  });

  it("skips records without assigned_to", () => {
    const records = [mkTicket({ assigned_to: "" })];
    const stats = deriveTechnicianStats(records);
    expect(stats).toHaveLength(0);
  });

  it("computes perf index between 0 and 100", () => {
    const records = Array.from({ length: 10 }, (_, i) => mkTicket({ number: `INC${i}`, assigned_to: "Alice" }));
    const stats = deriveTechnicianStats(records);
    expect(stats[0]!["Perf Index"]).toBeGreaterThanOrEqual(0);
    expect(stats[0]!["Perf Index"]).toBeLessThanOrEqual(100);
  });
});
