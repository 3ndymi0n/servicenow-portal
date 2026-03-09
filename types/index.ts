// ─── Roles ────────────────────────────────────────────────────────────────────
export type UserRole = "admin" | "analyst" | "viewer" | "employee";

export const ROLES: Record<UserRole, string> = {
  admin:    "Administrator",
  analyst:  "Analyst",
  viewer:   "Viewer",
  employee: "Employee",
};

// ─── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  displayName?: string;
  customers: string[] | ["*"];   // customer IDs, or ["*"] for all
  allowedGroups: Record<string, string[] | "*">;  // { custId: groups[] | "*" }
  businessUnit: string | null;
  isExecutive: boolean;
  isCustomerManager: boolean;
  managedCustomers: string[];
  active: boolean;
  createdAt: string;
}

// ─── Customer ─────────────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  name: string;
  code: string;
  industry: string;
  resolverGroups: string[];
  active: boolean;
  createdAt: string;
}

// ─── Business Unit ────────────────────────────────────────────────────────────
export interface BusinessUnit {
  id: string;
  name: string;
  customerId: string;
  groups: string[];
}

// ─── Ticket (raw record) ──────────────────────────────────────────────────────
export interface RawTicket {
  number: string;
  type: "Incident" | "Catalog Task";
  category: string;
  priority: string;
  assignment_group: string;
  assigned_to: string;
  state: string;
  sys_created_on: string;
  sys_updated_on: string;
  short_description?: string;
  work_notes?: string;
  _phase?: string;
  _sentiment?: string;
}

// ─── Aggregated analytics payload ─────────────────────────────────────────────
export interface DashboardSummary {
  total_inc: number;
  total_cat: number;
  total: number;
  mttr: number;
  median_ttr: number;
  sla_met: number;
  sla_breach: number;
  crit_high: number;
  crit_pct: number;
  reopen: number;
  reassign: number;
  reopen_rate: number;
  reassign_rate: number;
  groups: number;
  techs: number;
}

export interface MonthlyVolume {
  Month: string;
  Incidents: number;
  "Catalog Tasks": number;
  Total: number;
}

export interface TechnicianStats {
  Technician: string;
  Group: string;
  Total: number;
  Incidents: number;
  "Catalog Tasks": number;
  "Avg Res (hrs)": number;
  "Median Res (hrs)": number;
  "SLA Met %": number;
  "FCR %": number;
  "Reopen Rate %": number;
  "Reassign Rate %": number;
  Reassigned: number;
  Reopened: number;
  "Perf Index": number;
}

export interface GroupStats {
  Group: string;
  Total: number;
  Incidents: number;
  "Catalog Tasks": number;
  Resolved: number;
  "Res Rate %": number;
  "Avg Res (hrs)": number;
  "SLA Met %": number;
  "SLA Breach %": number;
  Escalations: number;
  Technicians: number;
  "Tickets/Tech": number;
}

export interface AnalyticsData {
  customerId: string;
  customerName: string;
  uploadedAt: string;
  dashboard: DashboardSummary;
  monthly_volume: MonthlyVolume[];
  monthly_priority: Array<Record<string, string | number>>;
  monthly_sla: Array<Record<string, string | number>>;
  cat_stats: Array<Record<string, string | number>>;
  technicians: TechnicianStats[];
  groups: GroupStats[];
  sla_priority: Array<Record<string, string | number>>;
  contact_type: Array<Record<string, string | number>>;
  cat_type: Array<Record<string, string | number>>;
  cat_state: Array<Record<string, string | number>>;
  cat_monthly: Array<Record<string, string | number>>;
  open_data: Array<Record<string, string | number>>;
  subcategories: Array<Record<string, string | number>>;
  sla_category: Array<Record<string, string | number>>;
  sla_group: Array<Record<string, string | number>>;
  raw_records: RawTicket[];
}

// ─── Customer Config (thresholds + benchmarks) ────────────────────────────────
export interface AlertThresholds {
  volume: number | null;
  sla: number | null;
  mttr: number | null;
  reopen: number | null;
  escl: number | null;
}

export interface BenchmarkTargets {
  sla_target: number | null;
  mttr_target: number | null;
  reopen_target: number | null;
  escl_target: number | null;
  fcr_target: number | null;
}

export interface CustomerConfig {
  customerId: string;
  thresholds: AlertThresholds;
  benchmarks: BenchmarkTargets;
}

// ─── Access Request ────────────────────────────────────────────────────────────
export type AccessRequestStatus = "pending" | "approved" | "denied";

export interface AccessRequest {
  id: string;
  userId: string;
  customerId: string;
  reason: string;
  status: AccessRequestStatus;
  createdAt: string;
  handledAt: string | null;
}

// ─── Notification ─────────────────────────────────────────────────────────────
export interface AppNotification {
  id: string;
  type: "unknown_group" | "upload_complete" | "access_request";
  customerId: string;
  customerName: string;
  groupName?: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// ─── Saved View ───────────────────────────────────────────────────────────────
export interface SavedView {
  id: string;
  name: string;
  custId: string;
  custName: string;
  filters: Record<string, unknown>;
  savedAt: string;
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
export interface Schedule {
  id: string;
  customerId: string;
  name: string;
  recipient: string;
  frequency: "weekly" | "monthly";
  metric: string;
  day: string;
  createdAt: string;
}

// ─── API response helpers ─────────────────────────────────────────────────────
export interface ApiError {
  error: string;
  code: string;
}

export type ApiResponse<T> = T | ApiError;
