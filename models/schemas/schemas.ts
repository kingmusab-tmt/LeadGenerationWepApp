import mongoose, { Schema } from "mongoose";
import { ITrackingNumber } from "../types/tracking";

/**
 * Tracking Numbers Schema
 * Defines the structure for phone number tracking configuration
 */
export const TrackingNumberSchema = {
  phoneNumber: {
    type: String,
    required: [true, "Phone number is required"],
    validate: {
      validator: (v: string) => /^\+?[1-9]\d{1,14}$/.test(v),
      message: "Invalid phone number format",
    },
  }, // Tracking phone number
  purpose: {
    type: String,
    enum: ["call", "sms"],
    default: "call",
  }, // Purpose of the number (call tracking or SMS campaigns)
  industry: {
    type: String,
    required: [true, "Industry is required"],
    minlength: [2, "Industry must be at least 2 characters"],
    maxlength: [100, "Industry cannot exceed 100 characters"],
  }, // Industry/niche
  forwardingType: {
    type: String,
    required: [true, "Forwarding type is required"],
  }, // Forwarding type
  method: {
    type: String,
    enum: ["Manual", "Automatic"],
    default: "Automatic",
  }, // Method of number acquisition
  recordCall: { type: Boolean, default: false }, // Call recording toggle
  reconnectCaller: { type: Boolean, default: false }, // Reconnect caller toggle
  passCallerId: { type: Boolean, default: false }, // Pass caller ID toggle
  leadSource: { type: String, default: "" }, // Source of the call
  welcomeMessage: { type: String, default: "" }, // Welcome message
  callWhisper: { type: String, default: "" }, // Call whisper message
  requireResponse: { type: Boolean, default: false }, // Require response toggle
  overflowNumber: { type: String, default: "" }, // Overflow number (ring before voicemail)

  // Seller working hours
  enableWorkingHours: { type: Boolean, default: false },
  workingHoursStart: { type: String, default: "09:00" },
  workingHoursEnd: { type: String, default: "17:00" },

  // Recording consent
  recordingConsent: { type: Boolean, default: false },
  recordingConsentMessage: {
    type: String,
    default: "This call may be recorded for quality and training purposes.",
  },

  // Missed call text-back
  missedCallTextBack: { type: Boolean, default: false },
  missedCallTextMessage: {
    type: String,
    default:
      "Sorry we missed your call! A representative will call you back shortly.",
  },

  // DNC & Spam
  dncEnabled: { type: Boolean, default: false },
  dncList: [{ type: String }],
  spamFilterEnabled: { type: Boolean, default: false },
  spamFilterAction: {
    type: String,
    enum: ["block", "warn"],
    default: "block",
  },

  // Scheduled callbacks
  scheduledCallbackEnabled: { type: Boolean, default: false },
  scheduledCallbackDigit: { type: String, default: "1" },

  // Multi-ring
  multiRingEnabled: { type: Boolean, default: false },

  // Geo-routing
  geoRoutingEnabled: { type: Boolean, default: false },

  // Concurrent call handling
  concurrentCallLimit: { type: Number, default: 0 }, // 0 = unlimited

  // AI features
  transcriptionEnabled: { type: Boolean, default: false },
  aiSummaryEnabled: { type: Boolean, default: false },

  forwardingNumbers: [{ type: String }], // Forwarding numbers (for "single_multiple")
  buyerResponses: [
    {
      message: {
        type: String,
        required: [true, "Response message is required"],
      },
      digit: {
        type: String,
        required: [true, "Response digit is required"],
      },
    },
  ], // Messages and digits for buyer verification
  leadResponses: [
    {
      message: {
        type: String,
        required: [true, "Lead response message is required"],
      },
      digit: {
        type: String,
        required: [true, "Lead response digit is required"],
      },
    },
  ], // Messages and digits for lead verification
  leadBuyers: [
    {
      id: { type: String, required: [true, "Buyer ID is required"] }, // Lead buyer ID
      name: {
        type: String,
        required: [true, "Buyer name is required"],
      }, // Lead buyer name
      phone: {
        type: String,
        required: [true, "Buyer phone is required"],
      },
    },
  ], // Lead buyers (for "specific_lead")
};

/**
 * Email Settings Schema
 */
export const EmailSettingsSchema = {
  emailAddress: {
    type: String,
    validate: {
      validator: (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      message: "Invalid email format",
    },
  },
  mailDomain: {
    type: String,
    validate: {
      validator: (v: string) =>
        !v || /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/.test(v),
      message: "Invalid mail domain format",
    },
  },
  smtpServer: {
    type: String,
    validate: {
      validator: (v: string) =>
        !v || /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/.test(v),
      message: "Invalid SMTP server format",
    },
  },
  smtpUser: { type: String },
  smtpPassword: { type: String },
  port: {
    type: Number,
    validate: {
      validator: (v: number) => !v || (v > 0 && v < 65536),
      message: "Port must be between 1 and 65535",
    },
  },
  fromEmail: {
    type: String,
    validate: {
      validator: (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      message: "Invalid from email format",
    },
  },
  fromName: { type: String },
  emailSubject: {
    type: String,
    maxlength: [255, "Email subject cannot exceed 255 characters"],
  },
  emailBody: {
    type: String,
    maxlength: [5000, "Email body cannot exceed 5000 characters"],
  },
};

/**
 * API Settings Schema
 */
export const ApiSettingsSchema = {
  twilioSid: {
    type: String,
    validate: {
      validator: (v: string) => !v || /^AC[a-z0-9]{32}$/i.test(v),
      message: "Invalid Twilio SID format",
    },
  },
  twilioAuthToken: {
    type: String,
    minlength: [32, "Twilio Auth Token must be at least 32 characters"],
  },
  twilioPhoneNumber: {
    type: String,
    validate: {
      validator: (v: string) => !v || /^\+?[1-9]\d{1,14}$/.test(v),
      message: "Invalid phone number format",
    },
  },
  zapierApiKeyHash: { type: String, default: "" },
  zapierApiKeyTruncated: { type: String, default: "" },
  zapierApiKeyCreatedAt: { type: Date, default: null },
};

/**
 * Credit Setup Schema
 */
export const CreditSetupSchema = {
  stripeSecretKey: { type: String, default: "" },
  stripePublishableKey: { type: String, default: "" },
  stripeWebhookSecret: { type: String, default: "" },
};

/**
 * Subscription Schema
 * Comprehensive subscription limits and usage tracking
 */
export const SubscriptionSchema = {
  usedTrial: { type: Boolean, default: false },
  subscriptionPlan: {
    type: String,
    minlength: [1, "Subscription plan cannot be empty"],
  },
  subscriptionStartDate: {
    type: Date,
    default: Date.now,
  },
  subscriptionPrice: {
    type: Number,
    validate: {
      validator: (v: number) => !v || v >= 0,
      message: "Subscription price cannot be negative",
    },
  },
  subscriptionTierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tier",
    required: [true, "Subscription tier ID is required"],
  },
  subscriptionTierType: {
    type: String,
    enum: {
      values: ["free", "paid"],
      message: "Subscription tier type must be free or paid",
    },
    default: "free",
  },
  subscriptionTierUserType: {
    type: String,
    enum: {
      values: ["seller", "business"],
      message: "User type must be seller or business",
    },
    default: "seller",
  },
  subscriptionRenewalPrice: {
    type: Number,
    validate: {
      validator: (v: number) => !v || v >= 0,
      message: "Renewal price cannot be negative",
    },
  },
  subscriptionExpiryDate: {
    type: Date,
    validate: {
      validator: function (v: Date) {
        if (!v) return true;
        return v > new Date();
      },
      message: "Expiry date must be in the future",
    },
  },
  isSubscriptionActive: { type: Boolean, default: false },
  isTrial: { type: Boolean, default: false },
  subscriptionRenewalDate: Date,
  subscriptionPaymentMethod: {
    type: String,
    enum: {
      values: ["stripe", "free"],
      message: "Payment method must be stripe or free",
    },
  },
  subscriptionPaymentId: String, // Legacy: Stripe checkout session ID

  // Recurring Billing Fields
  stripeSubscriptionId: String, // Stripe Subscription ID for recurring billing
  billingInterval: {
    type: String,
    enum: {
      values: ["month", "year"],
      message: "Billing interval must be month or year",
    },
    default: "month",
  },
  cancelAtPeriodEnd: { type: Boolean, default: false },
  canceledAt: Date,
  paymentFailed: { type: Boolean, default: false },
  lastPaymentFailedAt: Date,

  // Comprehensive Subscription Limits
  subscriptionLimits: {
    // Core Limits
    forms: { type: Number, default: 1, min: 0 },
    leads: { type: Number, default: 100, min: 0 },
    buyers: { type: Number, default: 5, min: 0 },
    industries: { type: Number, default: 1, min: 0 },

    // Call Tracking & Telephony
    numbers: { type: Number, default: 1, min: 0 },
    twilioNumbers: { type: Number, default: 0, min: 0 },
    callSeconds: { type: Number, default: 1000, min: 0 },
    callRecording: { type: Boolean, default: false },
    callTranscription: { type: Boolean, default: false },
    callAIAnalysis: { type: Boolean, default: false },
    multiRingForwarding: { type: Boolean, default: false },
    geoRouting: { type: Boolean, default: false },
    scheduledCallbacks: { type: Boolean, default: false },
    concurrentCallLimit: { type: Number, default: 1, min: 0 },

    // Marketing & Campaigns
    emailCampaignsEnabled: { type: Boolean, default: true },
    smsCampaignsEnabled: { type: Boolean, default: true },
    smsCampaignsPerMonth: { type: Number, default: 0, min: 0 },
    smsRecipientsPerCampaign: { type: Number, default: 50, min: 0 },
    smsPhoneNumbers: { type: Number, default: 0, min: 0 },

    // Automation & Workflows
    automationWorkflows: { type: Number, default: 0, min: 0 },
    automationActionsPerWorkflow: { type: Number, default: 3, min: 0 },

    // AI & Advanced Features
    chatbotEnabled: { type: Boolean, default: false },
    leadScoringEnabled: { type: Boolean, default: false },
    sentimentAnalysisEnabled: { type: Boolean, default: false },
    aiSummariesEnabled: { type: Boolean, default: false },
    aiGenerativeEnabled: { type: Boolean, default: true },

    // Invoicing & Payments
    invoicesPerMonth: { type: Number, default: 10, min: 0 },
    customInvoiceBranding: { type: Boolean, default: false },

    // Integrations
    zapierIntegration: { type: Boolean, default: false },
    webhookIntegration: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    maxWebhooks: { type: Number, default: 0, min: 0 },

    // Marketplace & Distribution
    marketplaceAccess: { type: Boolean, default: false },
    exclusiveLeads: { type: Boolean, default: false },
    leadDistributionRules: { type: Boolean, default: false },

    // Data & Reporting
    exports: { type: Boolean, default: false },
    imports: { type: Boolean, default: false },
    advancedReports: { type: Boolean, default: false },
    dataRetentionDays: { type: Number, default: 90, min: 0 },

    // Team & Access
    teamMembers: { type: Number, default: 1, min: 1 },
    maxConcurrentSessions: { type: Number, default: 1, min: 1 },

    // Support
    liveSupport: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },

    // Customization
    customBranding: { type: Boolean, default: false },
    customDomain: { type: Boolean, default: false },
  },

  // Subscription Usage Tracking
  subscriptionUsage: {
    // Core Usage
    leads: { type: Number, default: 0, min: 0 },
    callSeconds: { type: Number, default: 0, min: 0 },
    forms: { type: Number, default: 0, min: 0 },
    buyers: { type: Number, default: 0, min: 0 },

    // Campaign Usage
    emailCampaigns: { type: Number, default: 0, min: 0 },
    smsCampaigns: { type: Number, default: 0, min: 0 },

    // Automation Usage
    workflowExecutions: { type: Number, default: 0, min: 0 },

    // Invoice Usage
    invoices: { type: Number, default: 0, min: 0 },

    // Team Usage
    activeSessions: { type: Number, default: 0, min: 0 },
    teamMembersCount: { type: Number, default: 0, min: 0 },

    // Reset tracking
    usagePeriodStart: { type: Date, default: Date.now },
    usagePeriodEnd: { type: Date },
  },
};

/**
 * Unit Pricing Options Schema
 */
export const UnitPricingSchema = [
  {
    units: { type: Number, required: true, min: 1 },
    cost: { type: Number, required: true, min: 0.01 },
  },
];

/**
 * Call Charge Options Schema
 */
export const CallChargeSchema = [
  {
    units: { type: Number, required: true, min: 1 },
    seconds: { type: Number, required: true, min: 1 },
  },
];
