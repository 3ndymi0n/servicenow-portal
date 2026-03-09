import { z } from "zod";

// ─── User ─────────────────────────────────────────────────────────────────────
export const UserRoleSchema = z.enum(["admin", "analyst", "viewer", "employee"]);

export const CreateUserSchema = z.object({
  username:          z.string().min(3).max(50).toLowerCase(),
  email:             z.string().email().toLowerCase(),
  password:          z.string().min(8).max(100),
  role:              UserRoleSchema,
  displayName:       z.string().max(100).optional(),
  customers:         z.array(z.string()).default([]),
  allowedGroups:     z.record(z.union([z.array(z.string()), z.literal("*")])).default({}),
  businessUnit:      z.string().nullable().default(null),
  isExecutive:       z.boolean().default(false),
  isCustomerManager: z.boolean().default(false),
  managedCustomers:  z.array(z.string()).default([]),
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({ password: true }).extend({
  password: z.string().min(8).max(100).optional(),
  active:   z.boolean().optional(),
});

// ─── Customer ─────────────────────────────────────────────────────────────────
export const CreateCustomerSchema = z.object({
  name:           z.string().min(2).max(100).trim(),
  code:           z.string().min(2).max(20).toUpperCase().trim(),
  industry:       z.string().min(2).max(100).trim(),
  resolverGroups: z.array(z.string()).default([]),
});

export const UpdateCustomerSchema = CreateCustomerSchema.partial();

// ─── Business Unit ────────────────────────────────────────────────────────────
export const CreateBusinessUnitSchema = z.object({
  name:       z.string().min(2).max(100).trim(),
  customerId: z.string().min(1),
  groups:     z.array(z.string()).default([]),
});

export const UpdateBusinessUnitSchema = CreateBusinessUnitSchema.partial();

// ─── Raw Ticket ───────────────────────────────────────────────────────────────
export const RawTicketSchema = z.object({
  number:            z.string(),
  type:              z.enum(["Incident", "Catalog Task"]),
  category:          z.string(),
  priority:          z.string(),
  assignment_group:  z.string(),
  assigned_to:       z.string().default(""),
  state:             z.string(),
  sys_created_on:    z.string(),
  sys_updated_on:    z.string(),
  short_description: z.string().optional(),
  work_notes:        z.string().optional(),
  _phase:            z.string().optional(),
  _sentiment:        z.string().optional(),
});

export const UploadPayloadSchema = z.object({
  customerId: z.string().min(1),
  records:    z.array(RawTicketSchema).min(1).max(100_000),
});

// ─── Customer Config ──────────────────────────────────────────────────────────
const nullableNum = z.number().nullable().default(null);

export const AlertThresholdsSchema = z.object({
  volume: nullableNum,
  sla:    nullableNum,
  mttr:   nullableNum,
  reopen: nullableNum,
  escl:   nullableNum,
});

export const BenchmarkTargetsSchema = z.object({
  sla_target:    nullableNum,
  mttr_target:   nullableNum,
  reopen_target: nullableNum,
  escl_target:   nullableNum,
  fcr_target:    nullableNum,
});

export const CustomerConfigSchema = z.object({
  thresholds: AlertThresholdsSchema,
  benchmarks: BenchmarkTargetsSchema,
});

// ─── Access Request ───────────────────────────────────────────────────────────
export const CreateAccessRequestSchema = z.object({
  customerId: z.string().min(1),
  reason:     z.string().min(10).max(500).trim(),
});

export const HandleAccessRequestSchema = z.object({
  status: z.enum(["approved", "denied"]),
});

// ─── Saved View ───────────────────────────────────────────────────────────────
export const CreateSavedViewSchema = z.object({
  name:     z.string().min(1).max(100).trim(),
  custId:   z.string().min(1),
  custName: z.string().min(1),
  filters:  z.record(z.unknown()).default({}),
});

// ─── Login ────────────────────────────────────────────────────────────────────
export const LoginSchema = z.object({
  username: z.string().min(1).toLowerCase(),
  password: z.string().min(1),
});

// ─── Type exports ─────────────────────────────────────────────────────────────
export type CreateUserInput      = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput      = z.infer<typeof UpdateUserSchema>;
export type CreateCustomerInput  = z.infer<typeof CreateCustomerSchema>;
export type CreateBUInput        = z.infer<typeof CreateBusinessUnitSchema>;
export type RawTicketInput       = z.infer<typeof RawTicketSchema>;
export type UploadPayloadInput   = z.infer<typeof UploadPayloadSchema>;
export type CustomerConfigInput  = z.infer<typeof CustomerConfigSchema>;
