import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBusinessUnit extends Document {
  name: string;
  customerId: string;
  groups: string[];
  createdAt: Date;
}

const BusinessUnitSchema = new Schema<IBusinessUnit>(
  {
    name:       { type: String, required: true, trim: true },
    customerId: { type: String, required: true },
    groups:     { type: [String], default: [] },
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

BusinessUnitSchema.index({ customerId: 1 });

export const BusinessUnitModel: Model<IBusinessUnit> =
  mongoose.models["BusinessUnit"] ??
  mongoose.model<IBusinessUnit>("BusinessUnit", BusinessUnitSchema);
