import { describe, it, expect } from "vitest";
import { parseCsvText, mapCsvRow } from "@/lib/analytics/normalise";

describe("mapCsvRow", () => {
  it("maps standard ServiceNow export columns", () => {
    const row = {
      number:           "INC0001234",
      type:             "Incident",
      category:         "Network",
      priority:         "2 - High",
      assignment_group: "Service Desk",
      assigned_to:      "Alice Smith",
      state:            "Closed",
      sys_created_on:   "2025-01-15 09:00:00",
      sys_updated_on:   "2025-01-16 11:00:00",
    };
    const ticket = mapCsvRow(row);
    expect(ticket).not.toBeNull();
    expect(ticket!.number).toBe("INC0001234");
    expect(ticket!.type).toBe("Incident");
    expect(ticket!.category).toBe("Network");
  });

  it("maps alternative column names", () => {
    const row = {
      "Ticket Number":  "INC9999",
      "Type":           "Catalog Task",
      "Category":       "Software",
      "Priority":       "3 - Moderate",
      "Assignment Group":"Desktop Support",
      "Assigned To":    "Bob Jones",
      "State":          "In Progress",
      "Created":        "2025-02-01",
      "Updated":        "2025-02-02",
    };
    const ticket = mapCsvRow(row);
    expect(ticket).not.toBeNull();
    expect(ticket!.type).toBe("Catalog Task");
    expect(ticket!.assigned_to).toBe("Bob Jones");
  });

  it("returns null when ticket number is missing", () => {
    expect(mapCsvRow({ category: "Network" })).toBeNull();
  });

  it("maps catalog task type from keyword in value", () => {
    const row = { number:"TASK001", type:"catalog task", state:"Closed", sys_created_on:"2025-01", sys_updated_on:"2025-01" };
    const ticket = mapCsvRow(row);
    expect(ticket!.type).toBe("Catalog Task");
  });

  it("falls back sys_updated_on to sys_created_on when missing", () => {
    const row = { number:"INC001", sys_created_on:"2025-01-10", sys_updated_on:"" };
    const ticket = mapCsvRow(row);
    expect(ticket!.sys_updated_on).toBe("2025-01-10");
  });
});

describe("parseCsvText", () => {
  it("parses a basic 3-row CSV", () => {
    const csv = `number,type,category,priority,assignment_group,assigned_to,state,sys_created_on,sys_updated_on
INC001,Incident,Network,3 - Moderate,Service Desk,Alice,Closed,2025-01-10,2025-01-11
INC002,Incident,Software,2 - High,Desktop Support,Bob,Resolved,2025-01-12,2025-01-13
INC003,Catalog Task,Hardware,4 - Low,Server Team,Carol,In Progress,2025-01-15,2025-01-15`;
    const records = parseCsvText(csv);
    expect(records).toHaveLength(3);
    expect(records[0]!.number).toBe("INC001");
    expect(records[2]!.type).toBe("Catalog Task");
  });

  it("returns empty array for header-only CSV", () => {
    const csv = "number,type,category\n";
    expect(parseCsvText(csv)).toHaveLength(0);
  });

  it("skips rows with no ticket number", () => {
    const csv = "number,type,state\n,Incident,Closed\nINC001,Incident,Closed";
    const records = parseCsvText(csv);
    expect(records).toHaveLength(1);
  });

  it("handles quoted fields with commas", () => {
    const csv = `number,short_description\nINC001,"Printer, scanner, and copier all offline"`;
    const records = parseCsvText(csv);
    expect(records[0]!.short_description).toBe("Printer, scanner, and copier all offline");
  });

  it("handles Windows line endings", () => {
    const csv = "number,state\r\nINC001,Closed\r\nINC002,Open";
    const records = parseCsvText(csv);
    expect(records).toHaveLength(2);
  });
});
