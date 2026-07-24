import mongoose, { Schema, Document } from "mongoose";

export interface IScheduledCallback extends Document {
  sellerId: string;
  callerPhone: string;
  trackingNumber: string;
  industry: string;
  callSid: string; // Original call SID
  status: "pending" | "completed" | "failed" | "cancelled";
  // Always set to the creation time today (see createScheduledCallback) —
  // there's no caller- or seller-facing way to request a future time, so
  // this currently just tracks "when the request came in," not a real
  // schedule.
  scheduledFor?: Date;
  // Reserved for an automated retry-dialer that hasn't been built — nothing
  // in the codebase currently increments attemptCount or reads maxAttempts.
  // Today, resolving a callback is entirely manual: the seller sees it in
  // the Scheduled Callbacks tab, calls the customer themselves, then marks
  // it completed/cancelled.
  attemptCount: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  completedAt?: Date;
  completedBy?: string; // User _id (seller or admin) who marked this callback completed
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
