import { describe, it, expect } from "vitest";
import { resolveUserAccess, resolveEffectiveGroups } from "@/lib/auth/permissions";
import { canAccessCustomer, allowedGroupsForCustomer } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/session";
import type { Customer, BusinessUnit } from "@/types";

const makeUser = (overrides: Partial<SessionUser> = {}): SessionUser => ({
  id: "u1", username: "testuser", email: "test@example.com",
  role: "analyst", displayName: "Test User",
  customers: ["c1", "c2"], allowedGroups: {},
  businessUnit: null, isExecutive: false,
  isCustomerManager: false, managedCustomers: [],
  active: true, createdAt: new Date().toISOString(),
  ...overrides,
});

const C1: Customer = { id:"c1", name:"Acme", code:"ACME", industry:"Manufacturing", resolverGroups:["Service Desk","Network Team"], active:true, createdAt:"" };
const C2: Customer = { id:"c2", name:"Beta", code:"BETA", industry:"Finance",       resolverGroups:["Service Desk"], active:true, createdAt:"" };
const C3: Customer = { id:"c3", name:"Gamma",code:"GAMA", industry:"Logistics",     resolverGroups:["Desktop Support"], active:true, createdAt:"" };

const BU1: BusinessUnit = { id:"bu1", name:"IT Ops", customerId:"c1", groups:["Service Desk","Network Team"] };

describe("canAccessCustomer", () => {
  it("admin can access any customer", () => {
    const admin = makeUser({ role:"admin" });
    expect(canAccessCustomer(admin, "c1")).toBe(true);
    expect(canAccessCustomer(admin, "c999")).toBe(true);
  });

  it("analyst with wildcard can access any", () => {
    const u = makeUser({ customers:["*"] });
    expect(canAccessCustomer(u, "c1")).toBe(true);
  });

  it("analyst can access only their customers", () => {
    const u = makeUser({ customers:["c1"] });
    expect(canAccessCustomer(u, "c1")).toBe(true);
    expect(canAccessCustomer(u, "c2")).toBe(false);
  });
});

describe("allowedGroupsForCustomer", () => {
  it("admin gets null (all groups)", () => {
    const admin = makeUser({ role:"admin" });
    expect(allowedGroupsForCustomer(admin, "c1")).toBeNull();
  });

  it("returns null when no restrictions set", () => {
    const u = makeUser({ allowedGroups: {} });
    expect(allowedGroupsForCustomer(u, "c1")).toBeNull();
  });

  it("returns null when set to wildcard", () => {
    const u = makeUser({ allowedGroups: { c1: "*" } });
    expect(allowedGroupsForCustomer(u, "c1")).toBeNull();
  });

  it("returns restricted group list", () => {
    const u = makeUser({ allowedGroups: { c1: ["Service Desk"] } });
    const result = allowedGroupsForCustomer(u, "c1");
    expect(result).toEqual(["Service Desk"]);
  });
});

describe("resolveUserAccess", () => {
  it("admin gets all customers with no restrictions", () => {
    const admin = makeUser({ role:"admin" });
    const { accessibleCustomers, allowedGroups } = resolveUserAccess(admin, [C1,C2,C3], [BU1]);
    expect(accessibleCustomers).toHaveLength(3);
    Object.values(allowedGroups).forEach(g => expect(g).toBeNull());
  });

  it("BU scoping limits to BU customer and groups", () => {
    const u = makeUser({ businessUnit:"bu1", role:"analyst", customers:["c1","c2"] });
    const { accessibleCustomers, allowedGroups, buName } = resolveUserAccess(u, [C1,C2,C3], [BU1]);
    expect(accessibleCustomers).toHaveLength(1);
    expect(accessibleCustomers[0]!.id).toBe("c1");
    expect(allowedGroups["c1"]).toEqual(["Service Desk","Network Team"]);
    expect(buName).toBe("IT Ops");
  });

  it("customer list limits accessible customers", () => {
    const u = makeUser({ customers:["c2"] });
    const { accessibleCustomers } = resolveUserAccess(u, [C1,C2,C3], []);
    expect(accessibleCustomers).toHaveLength(1);
    expect(accessibleCustomers[0]!.id).toBe("c2");
  });
});

describe("resolveEffectiveGroups", () => {
  it("returns null when all constraints are null", () => {
    expect(resolveEffectiveGroups(null, null, null)).toBeNull();
  });

  it("intersects two constraints", () => {
    const result = resolveEffectiveGroups(
      ["Service Desk","Network Team","Server Team"],
      ["Service Desk","Network Team"],
      null
    );
    expect(result).toEqual(["Service Desk","Network Team"]);
  });

  it("returns empty array when no intersection", () => {
    const result = resolveEffectiveGroups(["Service Desk"], ["Desktop Support"], null);
    expect(result).toEqual([]);
  });

  it("single constraint just returns that constraint", () => {
    expect(resolveEffectiveGroups(["Service Desk","Network Team"], null, null))
      .toEqual(["Service Desk","Network Team"]);
  });
});
