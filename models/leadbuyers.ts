import mongoose, { Schema, Document, Model } from "mongoose";

// Define the interface for the Buyer document
export interface IBuyer extends Document {
  industries: any;
  _id: string;
  name: string;
  company: string;
  priority: number; // 1-10 scale
  maxLeadsPerDay: number;
  isActive: boolean;
  currentLeads: number;
  currentLeadsToday: number;
  qualificationScoreMinimum: number;
  walletUnit: number;
  email: string;
  lastAssignedAt: Date;
  lastAssignedLeadId: string;
  phone: string;
  walletBalance: number;
  status: "new" | "active" | "inactive" | "suspended";
  preferredDistribution: "automatic" | "manual" | "direct";
  notificationPreferences: ("email" | "sms" | "dashboard")[];
  leadPreferences: {
    location: string;
    industry: string;
  };
  workingHours: {
    start: string; // "09:00"
    end: string; // "17:00"
  };
  timezone: string;
  purchaseHistory: {
    leadId: string;
    date: Date;
    amount: number;
    unit: number;
  }[];
  paymentHistory: {
    date: Date;
    amount: number;
    method: string;
  }[];
  feedback: {
    rating: number;
    comment: string;
  }[];
  registeredWith: mongoose.Types.ObjectId;
}

// Define the Mongoose schema
const BuyerSchema: Schema = new Schema({
  name: { type: String, required: true },
  company: { type: String, required: true },
  priority: { type: Number, required: true, min: 1, max: 10, default: 5 },
  isActive: { type: Boolean, required: true, default: true },
  currentLeads: { type: Number, required: true, default: 0 },
  walletUnit: { type: Number, required: true, default: 0 },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  walletBalance: { type: Number, required: true, default: 0 },
  maxLeadsPerDay: { type: Number, required: true, default: 10 },
  currentLeadsToday: { type: Number, required: true, default: 0 },
  qualificationScoreMinimum: { type: Number, required: true, default: 0 },
  lastAssignedAt: { type: Date, default: Date.now },
  lastAssignedLeadId: { type: String, default: "" },
  workingHours: {
    start: { type: String, required: true }, // e.g., "09:00"
    end: { type: String, required: true }, // e.g., "17:00"
  },
  timezone: { type: String, required: true }, // e.g., "America/New_York"

  preferredDistribution: {
    type: String,
    enum: ["automatic", "manual", "direct"],
    default: "manual",
  },
  notificationPreferences: [
    {
      type: String,
      enum: ["email", "sms", "dashboard"],
    },
  ],
  status: {
    type: String,
    enum: ["new", "active", "inactive", "suspended"],
    default: "new",
  },
  leadPreferences: {
    location: { type: String, required: true },
    industry: { type: String, required: true },
  },
  purchaseHistory: [
    {
      leadId: { type: String },
      date: { type: Date },
      amount: { type: Number },
      unit: { type: Number },
    },
  ],
  paymentHistory: [
    {
      date: { type: Date },
      amount: { type: Number },
      method: { type: String },
    },
  ],
  feedback: [
    {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
    },
  ],
  registeredWith: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

BuyerSchema.index({ registeredWith: 1 }); // Index on registeredWith field

// Create and export the Mongoose model

export const Buyer: Model<IBuyer> =
  mongoose.models.Buyer || mongoose.model<IBuyer>("Buyer", BuyerSchema);
