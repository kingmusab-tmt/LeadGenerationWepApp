import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICampaign extends Document {
  userId?: mongoose.Schema.Types.ObjectId;
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  budget?: number;
  targetLeads: mongoose.Schema.Types.ObjectId[];
  status: "active" | "completed" | "draft" | "scheduled" | "paused";
  performanceMetrics?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

// Campaign Model
const CampaignSchema = new Schema<ICampaign>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    budget: { type: Number },
    targetLeads: [{ type: Schema.Types.ObjectId, ref: "Lead" }],
    status: {
      type: String,
      enum: ["active", "completed", "draft", "scheduled", "paused"],
      default: "draft",
    },
    performanceMetrics: { type: Object },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
  },
);

CampaignSchema.index({ userId: 1 }); // PHASE 3: Index for user campaigns
CampaignSchema.index({ targetLeads: 1 }); // PHASE 3: Index for lead campaigns
export const Campaign: Model<ICampaign> =
  mongoose.models.Campaign ||
  mongoose.model<ICampaign>("Campaign", CampaignSchema);
