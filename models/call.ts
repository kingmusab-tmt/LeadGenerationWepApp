// description: This file defines the Call model for MongoDB using Mongoose.
import mongoose, { Schema, Document } from "mongoose";

interface ICall extends Document {
  userId: string; // Lead seller ID
  buyerId?: string; // Lead buyer ID
  leadId?: mongoose.Types.ObjectId; // PHASE 3: Reference to Lead
  callSid: string;
  from: string;
  answeredBy: string;
  to: string;
  callStatus: string;
  status: string;
  callDuration?: number;
  recordingUrl?: string;
  paymentIntentId?: string;
  unitsCharged: number; // Units deducted for this call
  paymentStatus: "paid" | "refunded" | "pending_refund";
  reassigned?: boolean;
  forwardingType: string;
  forwardingNumbers: string[];
  leadBuyers: string[];
  industry: string;
  callRecorded: boolean;
  // Disposition
  disposition?: string;
  dispositionNotes?: string;
  // Transcription & AI
  transcription?: string;
  aiSummary?: string;
  aiSentiment?: "positive" | "neutral" | "negative";
  aiLeadScore?: string; // A/B/C/D grade
  // Geo data
  callerAreaCode?: string;
  callerCity?: string;
  callerState?: string;
  // Spam detection
  stirVerstat?: string; // STIR/SHAKEN attestation
  spamScore?: number; // 0-100
  flaggedAsSpam?: boolean;
  // Missed call text-back
  textBackSent?: boolean;
  // Voicemail fields
  voicemail?: {
    recordingUrl: string;
    duration: number;
    transcription?: string;
    listened: boolean;
    listenedAt?: Date;
  };
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
    leadId: { type: Schema.Types.ObjectId, ref: "Lead" }, // PHASE 3: Reference to Lead
    answeredBy: { type: String },
    callStatus: { type: String },
    from: { type: String, required: true },
    to: { type: String, required: true },
    status: { type: String, required: true },
    callRecorded: { type: Boolean, default: false },
    callDuration: { type: Number },
    recordingUrl: { type: String },
    paymentIntentId: { type: String },
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
    // Disposition
    disposition: {
      type: String,
      enum: [
        "qualified_lead",
        "not_interested",
        "wrong_number",
        "callback_requested",
        "sold",
        "voicemail",
        "spam",
        null,
      ],
      default: null,
    },
    dispositionNotes: { type: String, default: "" },
    // Transcription & AI
    transcription: { type: String },
    aiSummary: { type: String },
    aiSentiment: {
      type: String,
      enum: ["positive", "neutral", "negative", null],
      default: null,
    },
    aiLeadScore: {
      type: String,
      enum: ["A", "B", "C", "D", null],
      default: null,
    },
    // Geo data
    callerAreaCode: { type: String },
    callerCity: { type: String },
    callerState: { type: String },
    // Spam detection
    stirVerstat: { type: String },
    spamScore: { type: Number },
    flaggedAsSpam: { type: Boolean, default: false },
    // Missed call text-back
    textBackSent: { type: Boolean, default: false },
    voicemail: {
      type: {
        recordingUrl: { type: String },
        duration: { type: Number },
        transcription: { type: String },
        listened: { type: Boolean, default: false },
        listenedAt: { type: Date },
      },
      default: undefined,
    },
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
  { timestamps: true },
);

CallSchema.index({ leadId: 1 }); // PHASE 3: Index for lead queries
CallSchema.index({ userId: 1, leadId: 1 }); // PHASE 3: Index for user's lead calls
CallSchema.index({ buyerId: 1 }); // Buyer performance queries
CallSchema.index({ userId: 1, createdAt: -1 }); // Seller call history
CallSchema.index({ buyerId: 1, createdAt: -1 }); // Buyer call history
CallSchema.index({ disposition: 1 }); // Disposition filtering
CallSchema.index({ userId: 1, buyerId: 1 }); // Buyer performance per seller

export default mongoose.models.Call ||
  mongoose.model<ICall>("Call", CallSchema);
