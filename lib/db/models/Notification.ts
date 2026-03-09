import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  type: "unknown_group" | "upload_complete" | "access_request";
  customerId: string;
  customerName: string;
  groupName?: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    type:         { type: String, enum: ["unknown_group", "upload_complete", "access_request"], required: true },
    customerId:   { type: String, required: true },
    customerName: { type: String, required: true },
    groupName:    { type: String },
    message:      { type: String, required: true },
    read:         { type: Boolean, default: false },
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

NotificationSchema.index({ read: 1, createdAt: -1 });

export const NotificationModel: Model<INotification> =
  mongoose.models["Notification"] ??
  mongoose.model<INotification>("Notification", NotificationSchema);
