import mongoose, { Schema, Document, Model } from "mongoose";
import type { UserRole } from "@/types";

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  displayName?: string;
  customers: string[];
  allowedGroups: Map<string, string[] | "*">;
  businessUnit: string | null;
  isExecutive: boolean;
  isCustomerManager: boolean;
  managedCustomers: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username:         { type: String, required: true, unique: true, trim: true, lowercase: true },
    email:            { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash:     { type: String, required: true },
    role:             { type: String, enum: ["admin", "analyst", "viewer", "employee"], required: true },
    displayName:      { type: String },
    customers:        { type: [String], default: [] },
    allowedGroups:    { type: Map, of: Schema.Types.Mixed, default: {} },
    businessUnit:     { type: String, default: null },
    isExecutive:      { type: Boolean, default: false },
    isCustomerManager:{ type: Boolean, default: false },
    managedCustomers: { type: [String], default: [] },
    active:           { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret["id"] = ret["_id"]?.toString();
        delete ret["_id"];
        delete ret["__v"];
        delete ret["passwordHash"]; // never serialize password hash
        return ret;
      },
    },
  }
);

UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

export const UserModel: Model<IUser> =
  mongoose.models["User"] ?? mongoose.model<IUser>("User", UserSchema);
