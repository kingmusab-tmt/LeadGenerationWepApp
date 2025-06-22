import mongoose, { Schema, Model, Document } from "mongoose";

export interface ILead extends Document {
  _id: string; // Required for TypeScript compatibility with Document
  name?: string;
  conversationId?: string; // Optional field for conversation ID
  email?: string;
  phone?: string;
  company?: string;
  leadScore: number; // 0-10 scale
  scoreFactors: {
    completeness: number; // 0-3 points
    responsiveness: number; // 0-3 points
    valuePotential: number; // 0-4 points
  };
  followUps: Array<{
    date: Date;
    method: "call" | "email" | "message";
    outcome: "contacted" | "no-response" | "not-interested";
  }>;
  formId?: string;
  userId: string;
  fields: Array<{
    id: string;
    label: string;
    value: any; // Allow any type of value
  }>;
  status:
    | "new"
    | "available"
    | "sold"
    | "assigned"
    | "qualified"
    | "unqualified"
    | "transferred";
  distributionMethod: "manual" | "round_robin" | "marketplace";
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
  createdAt: Date;
  updatedAt: Date;
  qualificationScore?: number; // Optional field for qualification score
  industry?: string; // Optional field for industry
}

const LeadSchema = new Schema<ILead>(
  {
    conversationId: { type: String, required: true, unique: true, default: "" },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    company: { type: String, default: "" },

    distributionMethod: {
      type: String,
      enum: ["manual", "round_robin", "marketplace"],
      default: "marketplace",
    },
    qualificationScore: { type: Number, min: 0, max: 100, default: 0 },
    industry: { type: String, default: "" }, // Optional field for industry

    leadSource: { type: String },
    shared: { type: Boolean, default: false },
    soldCount: { type: Number, default: 0 },
    shareNumber: { type: Number, default: 1 },
    exclusive: { type: Boolean, default: false },
    unit: { type: Number, default: 5 },
    formId: { type: String, required: false },
    userId: { type: String, required: true },
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
    leadScore: {
      type: Number,
      min: 0,
      max: 10,
      default: 5,
    },
    scoreFactors: {
      completeness: { type: Number, default: 0 }, // 0-3 points
      responsiveness: { type: Number, default: 0 }, // 0-3 points
      valuePotential: { type: Number, default: 0 }, // 0-4 points
    },
    followUps: [
      {
        date: Date,
        method: String, // 'call', 'email', 'message'
        outcome: String, // 'contacted', 'no-response', 'not-interested'
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Lead: Model<ILead> =
  mongoose.models.Lead || mongoose.model<ILead>("Lead", LeadSchema);
