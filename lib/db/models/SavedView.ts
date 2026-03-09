import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISavedView extends Document {
  name: string;
  custId: string;
  custName: string;
  userId: string;
  filters: Record<string, unknown>;
  createdAt: Date;
}

const SavedViewSchema = new Schema<ISavedView>(
  {
    name:     { type: String, required: true, trim: true },
    custId:   { type: String, required: true },
    custName: { type: String, required: true },
    userId:   { type: String, required: true },
    filters:  { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

SavedViewSchema.index({ userId: 1, custId: 1 });

export const SavedViewModel: Model<ISavedView> =
  mongoose.models["SavedView"] ??
  mongoose.model<ISavedView>("SavedView", SavedViewSchema);
