import mongoose, { Schema, Document, Model } from "mongoose";
import { ISubscriptionLimits } from "./types/subscription";

export interface ITier extends Document {
  name: string;
  price: string;
  description: string;
  stripePriceId?: string; // Legacy - monthly price ID
  stripeProductId?: string;
  stripeMonthlyPriceId?: string; // Stripe Price ID for monthly billing
  stripeAnnualPriceId?: string; // Stripe Price ID for annual billing
  stripeCouponId?: string; // Stripe Coupon ID for discount
  features: string[];
  ctaText: string;
  highlight: boolean;
  isActive: boolean;
  order: number;
  tierType: "free" | "paid";
  tierUserType: "seller" | "business";
  discountPercentage?: number;
  discountDuration?: "once" | "forever" | "repeating";
  discountDurationMonths?: number;
  discountedPrice?: string;
  renewalPrice?: string;
  annualPrice?: string;
  billingInterval?: "month" | "year"; // Default billing interval
  tierLimits?: ISubscriptionLimits;
}

const TierSchema = new Schema<ITier>(
  {
    name: { type: String, required: true },
    price: { type: String, required: true },
    description: { type: String, required: true },
    features: { type: [String], required: true },
    stripePriceId: { type: String }, // Legacy - monthly price ID
    stripeProductId: { type: String },
    stripeMonthlyPriceId: { type: String }, // Stripe Price ID for monthly billing
    stripeAnnualPriceId: { type: String }, // Stripe Price ID for annual billing
    stripeCouponId: { type: String }, // Stripe Coupon ID for discount
    billingInterval: {
      type: String,
      enum: ["month", "year"],
      default: "month",
    },
    ctaText: { type: String, default: "Get Started" },
    highlight: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    order: { type: Number, required: true },
    tierType: {
      type: String,
      enum: ["free", "paid"],
      default: "paid",
    },
    tierUserType: {
      type: String,
      enum: ["seller", "business"],
      default: "seller",
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    discountDuration: {
      type: String,
      enum: ["once", "forever", "repeating"],
      default: "forever",
    },
    discountDurationMonths: {
      type: Number,
      min: 1,
      max: 24,
      default: 3,
    },
    discountedPrice: {
      type: String,
    },
    renewalPrice: {
      type: String,
    },
    annualPrice: {
      type: String,
    },
    tierLimits: {
      // Core Limits
      forms: { type: Number, default: 1 },
      leads: { type: Number, default: 100 },
      buyers: { type: Number, default: 5 },
      industries: { type: Number, default: 1 },

      // Call Tracking & Telephony
      numbers: { type: Number, default: 1 },
      twilioNumbers: { type: Number, default: 0 },
      callSeconds: { type: Number, default: 1000 },
      callRecording: { type: Boolean, default: false },
      callTranscription: { type: Boolean, default: false },
      callAIAnalysis: { type: Boolean, default: false },
      multiRingForwarding: { type: Boolean, default: false },
      geoRouting: { type: Boolean, default: false },
      scheduledCallbacks: { type: Boolean, default: false },
      concurrentCallLimit: { type: Number, default: 1 },

      // Marketing & Campaigns
      emailCampaignsEnabled: { type: Boolean, default: false },
      smsCampaignsPerMonth: { type: Number, default: 0 },
      smsRecipientsPerCampaign: { type: Number, default: 50 },
      smsPhoneNumbers: { type: Number, default: 0 },

      // Automation & Workflows
      automationWorkflows: { type: Number, default: 0 },
      automationActionsPerWorkflow: { type: Number, default: 3 },

      // AI & Advanced Features
      chatbotEnabled: { type: Boolean, default: false },
      leadScoringEnabled: { type: Boolean, default: false },
      sentimentAnalysisEnabled: { type: Boolean, default: false },
      aiSummariesEnabled: { type: Boolean, default: false },

      // Invoicing & Payments
      invoicesPerMonth: { type: Number, default: 10 },
      customInvoiceBranding: { type: Boolean, default: false },

      // Integrations
      zapierIntegration: { type: Boolean, default: false },
      webhookIntegration: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      maxWebhooks: { type: Number, default: 0 },

      // Marketplace & Distribution
      marketplaceAccess: { type: Boolean, default: false },
      exclusiveLeads: { type: Boolean, default: false },
      leadDistributionRules: { type: Boolean, default: false },

      // Data & Reporting
      exports: { type: Boolean, default: false },
      imports: { type: Boolean, default: false },
      advancedReports: { type: Boolean, default: false },
      dataRetentionDays: { type: Number, default: 90 },

      // Team & Access
      teamMembers: { type: Number, default: 1 },
      maxConcurrentSessions: { type: Number, default: 1 },

      // Support
      liveSupport: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },

      // Customization
      customBranding: { type: Boolean, default: false },
      customDomain: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

// Pre-save hook to calculate derived pricing fields
TierSchema.pre<ITier>("save", function (next) {
  if (this.isModified("price") || this.isModified("discountPercentage")) {
    const price = parseFloat(this.price);

    // Calculate discounted price
    if (this.discountPercentage && this.discountPercentage > 0) {
      const discountAmount = price * (this.discountPercentage / 100);
      this.discountedPrice = (price - discountAmount).toFixed(2);
    } else {
      this.discountedPrice = this.price;
    }

    // Calculate annual price
    this.annualPrice = (price * 12).toFixed(2);

    // Set default renewal price if not provided
    if (!this.renewalPrice) {
      this.renewalPrice = this.annualPrice;
    }
  }

  // Automatically set tierType based on price
  if (this.price === "0") {
    this.tierType = "free";
  } else {
    this.tierType = "paid";
  }

  next();
});

export const Tier: Model<ITier> =
  mongoose.models.Tier || mongoose.model<ITier>("Tier", TierSchema);
