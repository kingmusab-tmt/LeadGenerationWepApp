/**
 * Cancellation Feedback Model
 * Stores user feedback when canceling subscriptions for analytics and churn analysis
 */

import mongoose, { Schema, Model, Document } from "mongoose";

/**
 * Cancellation Reason Categories
 * Pre-defined reasons for tracking and analytics
 */
export const CANCELLATION_REASONS = [
  "too_expensive",
  "not_using_enough",
  "missing_features",
  "switching_competitor",
  "technical_issues",
  "poor_support",
  "business_closed",
  "temporary_pause",
  "other",
] as const;

export type CancellationReason = (typeof CANCELLATION_REASONS)[number];

/**
 * Cancellation Feedback Interface
 */
export interface ICancellationFeedback {
  userId: mongoose.Types.ObjectId;
  subscriptionId?: string; // Stripe subscription ID
  tierId?: string; // The tier they were on
  tierName?: string; // The tier name for easier querying
  reason: CancellationReason;
  feedbackText?: string; // Optional free-text feedback
  cancelType: "immediate" | "period_end";
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date; // When access will end
  monthsSubscribed?: number; // How long they were subscribed
  createdAt: Date;
  updatedAt: Date;
}

export interface ICancellationFeedbackDocument
  extends ICancellationFeedback, Document {}

/**
 * Cancellation Feedback Schema
 */
const CancellationFeedbackSchema = new Schema<ICancellationFeedbackDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    subscriptionId: {
      type: String,
      index: true,
    },
    tierId: {
      type: String,
    },
    tierName: {
      type: String,
    },
    reason: {
      type: String,
      enum: {
        values: CANCELLATION_REASONS,
        message: "Invalid cancellation reason",
      },
      required: [true, "Cancellation reason is required"],
      index: true,
    },
    feedbackText: {
      type: String,
      maxlength: [2000, "Feedback cannot exceed 2000 characters"],
    },
    cancelType: {
      type: String,
      enum: ["immediate", "period_end"],
      required: true,
    },
    subscriptionStartDate: {
      type: Date,
    },
    subscriptionEndDate: {
      type: Date,
    },
    monthsSubscribed: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Indexes for analytics queries
 */
// Time-based analytics
CancellationFeedbackSchema.index({ createdAt: -1 });

// Reason analysis
CancellationFeedbackSchema.index({ reason: 1, createdAt: -1 });

// Tier-based churn analysis
CancellationFeedbackSchema.index({ tierId: 1, reason: 1 });

// Compound index for detailed analytics
CancellationFeedbackSchema.index({
  reason: 1,
  tierId: 1,
  createdAt: -1,
});

/**
 * Static methods for analytics
 */
CancellationFeedbackSchema.statics.getReasonBreakdown = async function (
  startDate?: Date,
  endDate?: Date,
) {
  const matchStage: Record<string, unknown> = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate)
      (matchStage.createdAt as Record<string, Date>).$gte = startDate;
    if (endDate) (matchStage.createdAt as Record<string, Date>).$lte = endDate;
  }

  return this.aggregate([
    ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
    {
      $group: {
        _id: "$reason",
        count: { $sum: 1 },
        avgMonthsSubscribed: { $avg: "$monthsSubscribed" },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

CancellationFeedbackSchema.statics.getChurnByTier = async function (
  startDate?: Date,
  endDate?: Date,
) {
  const matchStage: Record<string, unknown> = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate)
      (matchStage.createdAt as Record<string, Date>).$gte = startDate;
    if (endDate) (matchStage.createdAt as Record<string, Date>).$lte = endDate;
  }

  return this.aggregate([
    ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
    {
      $group: {
        _id: "$tierId",
        tierName: { $first: "$tierName" },
        count: { $sum: 1 },
        reasons: {
          $push: "$reason",
        },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

export interface ICancellationFeedbackModel extends Model<ICancellationFeedbackDocument> {
  getReasonBreakdown(
    startDate?: Date,
    endDate?: Date,
  ): Promise<
    { _id: CancellationReason; count: number; avgMonthsSubscribed: number }[]
  >;
  getChurnByTier(
    startDate?: Date,
    endDate?: Date,
  ): Promise<
    {
      _id: string;
      tierName: string;
      count: number;
      reasons: CancellationReason[];
    }[]
  >;
}

export const CancellationFeedback: ICancellationFeedbackModel =
  (mongoose.models.CancellationFeedback as ICancellationFeedbackModel) ||
  mongoose.model<ICancellationFeedbackDocument, ICancellationFeedbackModel>(
    "CancellationFeedback",
    CancellationFeedbackSchema,
  );
