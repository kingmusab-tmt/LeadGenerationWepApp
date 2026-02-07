import mongoose, { Schema, Document } from "mongoose";

export interface IScheduledCallback extends Document {
  sellerId: string;
  callerPhone: string;
  trackingNumber: string;
  industry: string;
  callSid: string; // Original call SID
  status: "pending" | "completed" | "failed" | "cancelled";
  scheduledFor?: Date; // When to call back (null = ASAP)
  attemptCount: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  completedAt?: Date;
  completedBy?: string; // buyerId who completed the callback
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledCallbackSchema = new Schema<IScheduledCallback>(
  {
    sellerId: { type: String, required: true, index: true },
    callerPhone: { type: String, required: true },
    trackingNumber: { type: String, required: true },
    industry: { type: String, required: true },
    callSid: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
    },
    scheduledFor: { type: Date },
    attemptCount: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    lastAttemptAt: { type: Date },
    completedAt: { type: Date },
    completedBy: { type: String },
    notes: { type: String },
  },
  { timestamps: true },
);

ScheduledCallbackSchema.index({ sellerId: 1, status: 1 });
ScheduledCallbackSchema.index({ status: 1, scheduledFor: 1 }); // For cron job queries

export default mongoose.models.ScheduledCallback ||
  mongoose.model<IScheduledCallback>(
    "ScheduledCallback",
    ScheduledCallbackSchema,
  );
