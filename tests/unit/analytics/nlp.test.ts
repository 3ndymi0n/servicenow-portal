import { describe, it, expect } from "vitest";
import { tokenise, analyseTextRecords } from "@/lib/analytics/nlp";
import type { RawTicket } from "@/types";

describe("tokenise", () => {
  it("removes stop words", () => {
    const tokens = tokenise("the user cannot login to the system");
    expect(tokens).not.toContain("the");
    expect(tokens).not.toContain("to");
    expect(tokens).toContain("user");
    expect(tokens).toContain("login");
    expect(tokens).toContain("system");
  });

  it("lowercases all tokens", () => {
    const tokens = tokenise("Network ERROR Timeout");
    expect(tokens).toContain("network");
    expect(tokens).toContain("error");
    expect(tokens).toContain("timeout");
  });

  it("filters tokens shorter than 3 chars", () => {
    const tokens = tokenise("a pc is broken");
    expect(tokens).not.toContain("a");
    expect(tokens).not.toContain("pc");
    expect(tokens).not.toContain("is");
    expect(tokens).toContain("broken");
  });

  it("strips punctuation", () => {
    const tokens = tokenise("error: disk full!");
    expect(tokens).toContain("error");
    expect(tokens).toContain("disk");
    expect(tokens).toContain("full");
  });
});

describe("analyseTextRecords", () => {
  const makeTicket = (description: string, notes: string = ""): RawTicket => ({
    number: `INC${Math.random()}`, type: "Incident", category: "Network",
    priority: "3 - Moderate", assignment_group: "Service Desk",
    assigned_to: "Alice", state: "Closed",
    sys_created_on: "2025-01-15", sys_updated_on: "2025-01-16",
    short_description: description, work_notes: notes,
  });

  it("returns hasText=false when no text fields present", () => {
    const tickets: RawTicket[] = [{ number:"INC001", type:"Incident", category:"Network",
      priority:"3-Mod", assignment_group:"SD", assigned_to:"", state:"Closed",
      sys_created_on:"2025-01-01", sys_updated_on:"2025-01-01" }];
    const result = analyseTextRecords(tickets, []);
    expect(result.hasText).toBe(false);
  });

  it("returns hasText=true when descriptions are present", () => {
    const tickets = [makeTicket("user cannot access network drive")];
    const result = analyseTextRecords(tickets, []);
    expect(result.hasText).toBe(true);
    expect(result.totalAnalysed).toBe(1);
  });

  it("identifies top keywords", () => {
    const tickets = [
      makeTicket("network drive access denied"),
      makeTicket("network connection timeout error"),
      makeTicket("network printer not working"),
    ];
    const result = analyseTextRecords(tickets, []);
    const words = result.top_keywords.map(k => k.word);
    expect(words).toContain("network");
    // network appears in all 3 tickets
    const networkKw = result.top_keywords.find(k => k.word === "network");
    expect(networkKw?.count).toBe(3);
  });

  it("counts error terms", () => {
    const tickets = [makeTicket("account locked expired credential error")];
    const result = analyseTextRecords(tickets, []);
    const locked = result.error_counts.find(e => e.term === "locked");
    expect(locked?.count).toBeGreaterThan(0);
  });

  it("filters to specified months", () => {
    const jan = makeTicket("january issue");
    const feb = { ...makeTicket("february problem"), sys_created_on: "2025-02-10" };
    const result = analyseTextRecords([jan, feb], ["2025-01"]);
    expect(result.totalAnalysed).toBe(1);
  });
});
