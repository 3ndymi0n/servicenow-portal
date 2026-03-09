import { getServerSession } from "next-auth";
import { authOptions } from "./config";
import type { UserRole, User } from "@/types";

export type SessionUser = User & { id: string };

/** Get current session user. Returns null if unauthenticated. */
export async function getSession(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as SessionUser;
}

/** Throw a structured error if not authenticated. */
export async function requireSession(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) {
    throw new AuthError("Unauthenticated", "UNAUTHENTICATED", 401);
  }
  return user;
}

/** Throw if authenticated user doesn't have one of the required roles. */
export async function requireRole(roles: UserRole[]): Promise<SessionUser> {
  const user = await requireSession();
  if (!roles.includes(user.role)) {
    throw new AuthError(
      `Role '${user.role}' is not permitted. Required: ${roles.join(", ")}`,
      "FORBIDDEN",
      403,
    );
  }
  return user;
}

/** Throw if the current user cannot access the given customer ID. */
export async function requireCustomerAccess(
  customerId: string,
): Promise<SessionUser> {
  const user = await requireSession();
  const allowed = canAccessCustomer(user, customerId);
  if (!allowed) {
    throw new AuthError(
      `Access to customer '${customerId}' denied`,
      "FORBIDDEN",
      403,
    );
  }
  return user;
}

/** Pure function: does a user have access to a given customer? */
export function canAccessCustomer(
  user: SessionUser,
  customerId: string,
): boolean {
  if (user.role === "admin") return true;
  const customers = user.customers ?? [];
  if (customers.includes("*")) return true;
  return customers.includes(customerId);
}

/** Pure function: which resolver groups can this user see for a customer? */
export function allowedGroupsForCustomer(
  user: SessionUser,
  customerId: string,
): string[] | null {
  if (user.role === "admin") return null; // null = all groups
  const perms = user.allowedGroups[customerId];
  if (!perms || perms === "*") return null;
  return perms as string[];
}

// ─── Custom error class ───────────────────────────────────────────────────────
export class AuthError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = status;
  }
}
