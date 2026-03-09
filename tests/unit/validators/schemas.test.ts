import { describe, it, expect } from "vitest";
import {
  CreateUserSchema, CreateCustomerSchema, CreateBusinessUnitSchema,
  RawTicketSchema, CustomerConfigSchema, LoginSchema,
} from "@/lib/validators";

describe("CreateUserSchema", () => {
  const valid = {
    username: "alice", email: "alice@example.com", password: "Password1!",
    role: "analyst" as const,
  };

  it("validates a valid user", () => {
    expect(() => CreateUserSchema.parse(valid)).not.toThrow();
  });

  it("lowercases username and email", () => {
    const result = CreateUserSchema.parse({ ...valid, username: "ALICE", email: "ALICE@EXAMPLE.COM" });
    expect(result.username).toBe("alice");
    expect(result.email).toBe("alice@example.com");
  });

  it("rejects short password", () => {
    expect(() => CreateUserSchema.parse({ ...valid, password: "short" })).toThrow();
  });

  it("rejects invalid role", () => {
    expect(() => CreateUserSchema.parse({ ...valid, role: "superadmin" })).toThrow();
  });

  it("rejects invalid email", () => {
    expect(() => CreateUserSchema.parse({ ...valid, email: "not-an-email" })).toThrow();
  });
});

describe("CreateCustomerSchema", () => {
  it("validates and uppercases code", () => {
    const result = CreateCustomerSchema.parse({ name:"Acme Corp", code:"acme", industry:"Manufacturing" });
    expect(result.code).toBe("ACME");
  });

  it("rejects short name", () => {
    expect(() => CreateCustomerSchema.parse({ name:"A", code:"ACME", industry:"Manufacturing" })).toThrow();
  });
});

describe("RawTicketSchema", () => {
  const valid = {
    number: "INC001", type: "Incident" as const, category: "Network",
    priority: "3 - Moderate", assignment_group: "Service Desk",
    state: "Closed", sys_created_on: "2025-01-01", sys_updated_on: "2025-01-02",
  };

  it("validates a valid raw ticket", () => {
    expect(() => RawTicketSchema.parse(valid)).not.toThrow();
  });

  it("rejects invalid ticket type", () => {
    expect(() => RawTicketSchema.parse({ ...valid, type: "Problem" })).toThrow();
  });

  it("defaults assigned_to to empty string", () => {
    const result = RawTicketSchema.parse(valid);
    expect(result.assigned_to).toBe("");
  });
});

describe("CustomerConfigSchema", () => {
  it("accepts null values for all targets", () => {
    const cfg = {
      thresholds: { volume:null, sla:null, mttr:null, reopen:null, escl:null },
      benchmarks: { sla_target:null, mttr_target:null, reopen_target:null, escl_target:null, fcr_target:null },
    };
    expect(() => CustomerConfigSchema.parse(cfg)).not.toThrow();
  });

  it("accepts numeric values", () => {
    const cfg = {
      thresholds: { volume:500, sla:90, mttr:24, reopen:5, escl:2 },
      benchmarks: { sla_target:95, mttr_target:12, reopen_target:3, escl_target:1, fcr_target:80 },
    };
    expect(() => CustomerConfigSchema.parse(cfg)).not.toThrow();
  });
});

describe("LoginSchema", () => {
  it("lowercases username", () => {
    const result = LoginSchema.parse({ username:"ADMIN", password:"secret" });
    expect(result.username).toBe("admin");
  });

  it("rejects empty credentials", () => {
    expect(() => LoginSchema.parse({ username:"", password:"" })).toThrow();
  });
});
