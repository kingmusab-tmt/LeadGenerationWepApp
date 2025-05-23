// description: This file defines the Call model for MongoDB using Mongoose.
import mongoose, { Schema, Document } from "mongoose";

interface ICall extends Document {
  userId: string; // Lead seller ID
  buyerId?: string; // Lead buyer ID
  callSid: string;
  from: string;
  answeredBy: string;
  to: string;
  callStatus: string;
  status: string;
  callDuration?: number;
  recordingUrl?: string;
  unitsCharged: number; // Units deducted for this call
  paymentStatus: "paid" | "refunded" | "pending_refund";
  reassigned?: boolean;
  forwardingType: string;
  forwardingNumbers: string[];
  leadBuyers: string[];
  industry: string;
  callRecorded: boolean;
  feedback?: {
    buyerRating: boolean | null; // true = good, false = bad
    sellerApproved: boolean | null; // null = not reviewed
    sellerComment?: string;
    refundAmount?: number;
    refundedAt?: Date;
  };
}

const CallSchema = new Schema<ICall>(
  {
    userId: { type: String, required: true },
    callSid: { type: String, required: true },
    buyerId: { type: String },
    answeredBy: { type: String },
    callStatus: { type: String },
    from: { type: String, required: true },
    to: { type: String, required: true },
    status: { type: String, required: true },
    callRecorded: { type: Boolean, default: false },
    callDuration: { type: Number },
    recordingUrl: { type: String },
    unitsCharged: { type: Number, default: 0 }, // Units charged for this call
    paymentStatus: {
      type: String,
      enum: ["paid", "refunded", "pending_refund"],
      default: "paid",
    },
    forwardingType: { type: String, required: true },
    forwardingNumbers: { type: [String], default: [] },
    leadBuyers: { type: [String], default: [] },
    industry: { type: String, required: true },
    reassigned: { type: Boolean, default: false },
    feedback: {
      type: {
        buyerRating: { type: Boolean, default: null },
        sellerApproved: { type: Boolean, default: null },
        sellerComment: { type: String },
        refundAmount: { type: Number },
        refundedAt: { type: Date },
      },
      default: {},
    },
  },
  { timestamps: true }
);

export default mongoose.models.Call ||
  mongoose.model<ICall>("Call", CallSchema);
