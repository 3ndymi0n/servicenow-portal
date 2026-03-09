import type { SessionUser } from "./session";
import type { BusinessUnit, Customer } from "@/types";

export interface ResolvedAccess {
  accessibleCustomers: Customer[];
  allowedGroups: Record<string, string[] | null>; // null = all groups for that customer
  buName: string | null;
}

/**
 * Resolves which customers and groups a user can see, accounting for:
 * 1. Admin role (sees all)
 * 2. Business unit scoping (limits to BU's customer + groups)
 * 3. Explicit customer list + per-customer group restrictions
 */
export function resolveUserAccess(
  user: SessionUser,
  allCustomers: Customer[],
  allBUs: BusinessUnit[]
): ResolvedAccess {
  if (user.role === "admin") {
    return {
      accessibleCustomers: allCustomers,
      allowedGroups: Object.fromEntries(allCustomers.map((c) => [c.id, null])),
      buName: null,
    };
  }

  // Business unit scoping takes priority over explicit customer list
  if (user.businessUnit) {
    const bu = allBUs.find((b) => b.id === user.businessUnit);
    if (bu) {
      const customer = allCustomers.find((c) => c.id === bu.customerId);
      return {
        accessibleCustomers: customer ? [customer] : [],
        allowedGroups: { [bu.customerId]: bu.groups },
        buName: bu.name,
      };
    }
  }

  // Standard customer list
  const accessible =
    user.customers.includes("*")
      ? allCustomers
      : allCustomers.filter((c) => user.customers.includes(c.id));

  const allowedGroups: Record<string, string[] | null> = {};
  for (const c of accessible) {
    const perm = user.allowedGroups[c.id];
    allowedGroups[c.id] = !perm || perm === "*" ? null : (perm as string[]);
  }

  return { accessibleCustomers: accessible, allowedGroups, buName: null };
}

/**
 * Given sidebar filter selections + role-based restrictions, returns the
 * effective list of groups to show for a customer.
 * Returns null if all groups should be shown.
 */
export function resolveEffectiveGroups(
  userAllowedGroups: string[] | null,
  buFilteredGroups: string[] | null,
  sidebarSelectedGroups: string[] | null
): string[] | null {
  // Collect non-null constraints
  const constraints = [userAllowedGroups, buFilteredGroups, sidebarSelectedGroups].filter(
    (g): g is string[] => g !== null
  );

  if (constraints.length === 0) return null; // all groups

  // Intersection of all constraints
  const [first, ...rest] = constraints;
  const result = first!.filter((g) => rest.every((c) => c.includes(g)));
  return result.length > 0 ? result : [];
}
