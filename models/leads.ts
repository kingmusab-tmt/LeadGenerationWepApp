import mongoose, { Schema, Model, Document } from "mongoose";

export interface ILead extends Document {
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
  status: "new" | "available" | "sold" | "assigned";
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
    buyerId: string;
    accepted: boolean;
    rejected: boolean;
  }[];
  isManual: boolean;
  leadSource: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    distributionMethod: {
      type: String,
      enum: ["manual", "round_robin", "marketplace"],
      default: "marketplace",
    },
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
      enum: ["new", "available", "sold", "assigned"],
      default: "new",
    },
    isManual: { type: Boolean, default: false },
    assignedTo: {
      type: [
        {
          buyerId: { type: String },
          accepted: { type: Boolean, default: false },
          rejected: { type: Boolean, default: false },
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
