import mongoose, { Schema, Document, Model } from "mongoose";

// Lean schema — the analytics payload is large and treated as a blob.
// Validation is handled by Zod at the API boundary before writing.
export interface ITicketData extends Document {
  customerId: string;
  customerName: string;
  uploadedAt: Date;
  uploadedBy: string;
  // Full denormalized analytics payload stored as Mixed for flexibility
  dashboard: Record<string, unknown>;
  monthly_volume: unknown[];
  monthly_priority: unknown[];
  monthly_sla: unknown[];
  cat_stats: unknown[];
  technicians: unknown[];
  groups: unknown[];
  sla_priority: unknown[];
  contact_type: unknown[];
  cat_type: unknown[];
  cat_state: unknown[];
  cat_monthly: unknown[];
  open_data: unknown[];
  subcategories: unknown[];
  sla_category: unknown[];
  sla_group: unknown[];
  raw_records: unknown[];
}

const TicketDataSchema = new Schema<ITicketData>(
  {
    customerId:    { type: String, required: true, unique: true },
    customerName:  { type: String, required: true },
    uploadedAt:    { type: Date, required: true },
    uploadedBy:    { type: String, required: true },
    dashboard:     { type: Schema.Types.Mixed, default: {} },
    monthly_volume:{ type: [Schema.Types.Mixed], default: [] },
    monthly_priority: { type: [Schema.Types.Mixed], default: [] },
    monthly_sla:   { type: [Schema.Types.Mixed], default: [] },
    cat_stats:     { type: [Schema.Types.Mixed], default: [] },
    technicians:   { type: [Schema.Types.Mixed], default: [] },
    groups:        { type: [Schema.Types.Mixed], default: [] },
    sla_priority:  { type: [Schema.Types.Mixed], default: [] },
    contact_type:  { type: [Schema.Types.Mixed], default: [] },
    cat_type:      { type: [Schema.Types.Mixed], default: [] },
    cat_state:     { type: [Schema.Types.Mixed], default: [] },
    cat_monthly:   { type: [Schema.Types.Mixed], default: [] },
    open_data:     { type: [Schema.Types.Mixed], default: [] },
    subcategories: { type: [Schema.Types.Mixed], default: [] },
    sla_category:  { type: [Schema.Types.Mixed], default: [] },
    sla_group:     { type: [Schema.Types.Mixed], default: [] },
    raw_records:   { type: [Schema.Types.Mixed], default: [] },
  },
  {
    timestamps: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret["id"] = ret["_id"]?.toString();
        delete ret["_id"];
        delete ret["__v"];
        return ret;
      },
    },
  }
);

TicketDataSchema.index({ customerId: 1 });
// Index on raw_records fields for efficient server-side aggregation
TicketDataSchema.index({ "raw_records.assigned_to": 1 });
TicketDataSchema.index({ "raw_records.sys_created_on": 1 });

export const TicketDataModel: Model<ITicketData> =
  mongoose.models["TicketData"] ??
  mongoose.model<ITicketData>("TicketData", TicketDataSchema);
