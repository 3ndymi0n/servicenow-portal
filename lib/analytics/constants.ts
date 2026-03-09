export const ALL_GROUPS = [
  "Service Desk",
  "Network Team",
  "Server Team",
  "Security Team",
  "Desktop Support",
] as const;

export const CATEGORIES = [
  "Network",
  "Hardware",
  "Software",
  "Access/Security",
  "Email",
  "Server",
  "Database",
  "Printing",
] as const;

export const PRIORITIES = [
  "1 - Critical",
  "2 - High",
  "3 - Moderate",
  "4 - Low",
] as const;

export const STATES = ["Closed", "Resolved", "In Progress", "On Hold"] as const;

export const CLOSED_STATES = new Set([
  "resolved",
  "closed",
  "complete",
  "completed",
  "closed complete",
]);

export const CONTACT_TYPES = ["Phone", "Email", "Self-Service", "Walk-In", "Chat"] as const;

/** Default seed data months */
export const DEFAULT_MONTHS = [
  "2024-10",
  "2024-11",
  "2024-12",
  "2025-01",
  "2025-02",
  "2025-03",
] as const;

export const EMPLOYEE_NAME = "Taylor Brooks";
