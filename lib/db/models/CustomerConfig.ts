import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICustomerConfig extends Document {
  customerId: string;
  thresholds: {
    volume: number | null;
    sla: number | null;
    mttr: number | null;
    reopen: number | null;
    escl: number | null;
  };
  benchmarks: {
    sla_target: number | null;
    mttr_target: number | null;
    reopen_target: number | null;
    escl_target: number | null;
    fcr_target: number | null;
  };
  updatedAt: Date;
}

const nullableNumber = { type: Number, default: null };

const CustomerConfigSchema = new Schema<ICustomerConfig>(
  {
    customerId: { type: String, required: true, unique: true },
    thresholds: {
      volume: nullableNumber,
      sla:    nullableNumber,
      mttr:   nullableNumber,
      reopen: nullableNumber,
      escl:   nullableNumber,
    },
    benchmarks: {
      sla_target:    nullableNumber,
      mttr_target:   nullableNumber,
      reopen_target: nullableNumber,
      escl_target:   nullableNumber,
      fcr_target:    nullableNumber,
    },
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

export const CustomerConfigModel: Model<ICustomerConfig> =
  mongoose.models["CustomerConfig"] ??
  mongoose.model<ICustomerConfig>("CustomerConfig", CustomerConfigSchema);
