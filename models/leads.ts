import mongoose, { Schema, Model, Document } from "mongoose";

export interface ILead extends Document {
  _id: string; // Required for TypeScript compatibility with Document
  name?: string;
  conversationId?: string; // Optional field for conversation ID
  email?: string;
  phone?: string;
  company?: string;
  // AI Quality Assessment (replaces manual scoring)
  aiQualityScore: number; // 0-100 spam score from Gemini
  qualityLevel: "High" | "Medium" | "Low"; // High (0-40 spam=good), Medium (41-69), Low (70-100 spam=bad)
  aiQualityReason: string; // Explanation from AI
  aiQualityAssessment?: {
    isValid: boolean;
    spamScore: number;
    reason: string;
    evaluatedAt: Date;
  };
  followUps: Array<{
    date: Date;
    method: "call" | "email" | "message";
    outcome: "contacted" | "no-response" | "not-interested";
  }>;
  formId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  calls: mongoose.Types.ObjectId[]; // PHASE 3: Array of Call IDs for this lead
  fields: Array<{
    id: string;
    label: string;
    value: unknown; // Allow any type of value
  }>;
  status:
    | "new"
    | "available"
    | "sold"
    | "assigned"
    | "qualified"
    | "unqualified"
    | "transferred";
  exclusive: boolean;
  shared: boolean;
  shareNumber: number;
  soldCount: number;
  unit: number;
  soldTo: {
    buyerId: string;
    createdAt: Date;
    unit: number;
  }[];
  assignedTo: {
    id?: string; // Optional field for leadId in assignment
    buyerId: string;
    accepted: boolean;
    rejected: boolean;
    assignedAt: Date;
    notes?: string;
  }[];
  isManual: boolean;
  leadSource: string;
  distributionMethod?: "manual" | "round_robin" | "marketplace";
  createdAt: Date;
  updatedAt: Date;
  industry?: string; // Optional field for industry
  location?: {
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    address?: string;
  };
}

const LeadSchema = new Schema<ILead>(
  {
    conversationId: { type: String, unique: true, sparse: true },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    company: { type: String, default: "" },

    industry: { type: String, default: "" }, // Optional field for industry
    location: {
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      country: { type: String, default: "USA" },
      zipCode: { type: String, default: "" },
      address: { type: String, default: "" },
    },

    leadSource: { type: String },
    shared: { type: Boolean, default: false },
    soldCount: { type: Number, default: 0 },
    shareNumber: { type: Number, default: 1 },
    exclusive: { type: Boolean, default: false },
    unit: { type: Number, default: 5 },
    formId: { type: Schema.Types.ObjectId, ref: "Form", required: false },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fields: {
      type: [
        {
          id: { type: String, required: true },
          label: { type: String, required: true },
          value: { type: Schema.Types.Mixed, required: true }, // Allow any type of value
        },
      ],
      required: true,
    },

    // AI Quality Assessment (replaces manual scoring)
    aiQualityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50, // Default to Medium
    },
    qualityLevel: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
    aiQualityReason: { type: String, default: "" },
    aiQualityAssessment: {
      isValid: { type: Boolean, default: true },
      spamScore: { type: Number, default: 50 },
      reason: { type: String, default: "" },
      evaluatedAt: { type: Date, default: Date.now },
    },

    status: {
      type: String,
      enum: [
        "new",
        "available",
        "sold",
        "assigned",
        "qualified",
        "unqualified",
        "transferred",
      ],
      default: "new",
    },
    isManual: { type: Boolean, default: false },
    assignedTo: {
      type: [
        {
          id: { type: String }, // Optional field for leadId in assignment
          buyerId: { type: String },
          accepted: { type: Boolean, default: false },
          rejected: { type: Boolean, default: false },
          assignedAt: { type: Date, default: Date.now },
          notes: { type: String, default: "" },
        },
      ],
      default: [],
    },
    soldTo: {
      type: [
        {
          buyerId: { type: String, required: true },
          createdAt: { type: Date, default: Date.now },
          unit: { type: Number, required: true },
        },
      ],
      default: [],
    },
    followUps: [
      {
        date: Date,
        method: String, // 'call', 'email', 'message'
        outcome: String, // 'contacted', 'no-response', 'not-interested'
      },
    ],
    calls: [
      {
        type: Schema.Types.ObjectId,
        ref: "Call",
      },
    ],
    distributionMethod: {
      type: String,
      enum: ["manual", "round_robin", "marketplace"],
      default: "marketplace",
    },
  },
  {
    timestamps: true,
  },
);

LeadSchema.index({ calls: 1 }); // PHASE 3: Index for call queries
LeadSchema.index({ userId: 1 }); // Seller/user lookup queries
LeadSchema.index({ formId: 1 }); // Form-origin lookup queries
LeadSchema.index({ status: 1 }); // Status-based lead filters
LeadSchema.index({ "assignedTo.buyerId": 1 }); // Buyer assignment lookup queries
LeadSchema.index({ "soldTo.buyerId": 1 }); // Sold lead lookup queries
LeadSchema.index({ userId: 1, status: 1 }); // Common seller lead list queries

export const Lead: Model<ILead> =
  mongoose.models.Lead || mongoose.model<ILead>("Lead", LeadSchema);
