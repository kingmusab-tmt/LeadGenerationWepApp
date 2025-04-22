import mongoose, { Schema, Document, Model } from "mongoose";

// Define the interface for the Buyer document
export interface IBuyer extends Document {
  _id: string;
  name: string;
  company: string;
  walletUnit: number;
  email: string;
  phone: string;
  walletBalance: number;
  status: "new" | "active" | "inactive" | "suspended";
  preferredDistribution: "automatic" | "manual" | "direct";
  notificationPreferences: ("email" | "sms" | "dashboard")[];
  leadPreferences: {
    location: string;
    industry: string;
  };
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
  walletUnit: { type: Number },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  walletBalance: { type: Number },
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
