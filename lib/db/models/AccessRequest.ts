import mongoose, { Schema, Document, Model } from "mongoose";
import type { AccessRequestStatus } from "@/types";

export interface IAccessRequest extends Document {
  userId: string;
  customerId: string;
  reason: string;
  status: AccessRequestStatus;
  handledAt: Date | null;
  handledBy: string | null;
  createdAt: Date;
}

const AccessRequestSchema = new Schema<IAccessRequest>(
  {
    userId:     { type: String, required: true },
    customerId: { type: String, required: true },
    reason:     { type: String, required: true, trim: true },
    status:     { type: String, enum: ["pending", "approved", "denied"], default: "pending" },
    handledAt:  { type: Date, default: null },
    handledBy:  { type: String, default: null },
  },
  {
    timestamps: true,
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

AccessRequestSchema.index({ userId: 1 });
AccessRequestSchema.index({ status: 1 });

export const AccessRequestModel: Model<IAccessRequest> =
  mongoose.models["AccessRequest"] ??
  mongoose.model<IAccessRequest>("AccessRequest", AccessRequestSchema);
