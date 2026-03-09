import { describe, it, expect } from "vitest";
import { deduplicateRecords } from "@/lib/analytics/deduplicate";
import type { RawTicket } from "@/types";

const makeTicket = (overrides: Partial<RawTicket> = {}): RawTicket => ({
  number: "INC001",
  type: "Incident",
  category: "Network",
  priority: "3 - Moderate",
  assignment_group: "Service Desk",
  assigned_to: "Alice",
  state: "Closed",
  sys_created_on: "2025-01-01 09:00:00",
  sys_updated_on: "2025-01-02 10:00:00",
  ...overrides,
});

describe("deduplicateRecords", () => {
  it("adds a brand-new ticket", () => {
    const { merged, stats } = deduplicateRecords([], [makeTicket()]);
    expect(merged).toHaveLength(1);
    expect(stats.added).toBe(1);
    expect(stats.updated).toBe(0);
    expect(stats.skipped).toBe(0);
  });

  it("updates when incoming has newer sys_updated_on", () => {
    const existing = [makeTicket({ sys_updated_on: "2025-01-02 10:00:00" })];
    const incoming = [makeTicket({ state: "Resolved", sys_updated_on: "2025-01-03 15:00:00" })];
    const { merged, stats } = deduplicateRecords(existing, incoming);
    expect(stats.updated).toBe(1);
    expect(stats.added).toBe(0);
    expect(merged[0]!.state).toBe("Resolved");
  });

  it("skips when existing is newer", () => {
    const existing = [makeTicket({ sys_updated_on: "2025-01-05 00:00:00" })];
    const incoming = [makeTicket({ state: "Resolved", sys_updated_on: "2025-01-02 00:00:00" })];
    const { merged, stats } = deduplicateRecords(existing, incoming);
    expect(stats.skipped).toBe(1);
    expect(merged[0]!.state).toBe("Closed"); // unchanged
  });

  it("skips when dates are equal", () => {
    const t = makeTicket({ sys_updated_on: "2025-01-02 10:00:00" });
    const { stats } = deduplicateRecords([t], [{ ...t, state: "Resolved" }]);
    expect(stats.skipped).toBe(1);
  });

  it("flags no-date tickets", () => {
    const ticket = makeTicket({ number: "INC999", sys_created_on: "", sys_updated_on: "" });
    const { stats, details } = deduplicateRecords([], [ticket]);
    expect(stats.noDate).toBe(1);
    expect(details.noDate).toHaveLength(1);
    // Still added since it's new
    expect(stats.added).toBe(1);
  });

  it("handles mixed batch correctly", () => {
    const existing = [
      makeTicket({ number: "INC001", sys_updated_on: "2025-01-01" }),
      makeTicket({ number: "INC002", sys_updated_on: "2025-01-05" }),
    ];
    const incoming = [
      makeTicket({ number: "INC001", sys_updated_on: "2025-01-03" }), // newer → update
      makeTicket({ number: "INC002", sys_updated_on: "2025-01-02" }), // older → skip
      makeTicket({ number: "INC003", sys_updated_on: "2025-01-04" }), // new → add
    ];
    const { stats } = deduplicateRecords(existing, incoming);
    expect(stats.added).toBe(1);
    expect(stats.updated).toBe(1);
    expect(stats.skipped).toBe(1);
    expect(stats.total).toBe(3);
  });

  it("is case-insensitive on ticket number", () => {
    const existing = [makeTicket({ number: "INC001" })];
    const incoming = [makeTicket({ number: "inc001", state: "Resolved", sys_updated_on: "2025-02-01" })];
    const { stats } = deduplicateRecords(existing, incoming);
    expect(stats.updated).toBe(1);
  });
});
