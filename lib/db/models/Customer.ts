import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICustomer extends Document {
  name: string;
  code: string;
  industry: string;
  resolverGroups: string[];
  active: boolean;
  createdAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name:           { type: String, required: true, trim: true },
    code:           { type: String, required: true, trim: true, uppercase: true },
    industry:       { type: String, required: true, trim: true },
    resolverGroups: { type: [String], default: [] },
    active:         { type: Boolean, default: true },
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

CustomerSchema.index({ code: 1 }, { unique: true });

export const CustomerModel: Model<ICustomer> =
  mongoose.models["Customer"] ?? mongoose.model<ICustomer>("Customer", CustomerSchema);
