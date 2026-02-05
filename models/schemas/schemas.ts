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
};

/**
 * Credit Setup Schema
 */
export const CreditSetupSchema = {
  stripeSecretKey: { type: String, default: "" },
  stripePublishableKey: { type: String, default: "" },
  stripeWebhookSecret: { type: String, default: "" },
  paypalClientId: { type: String, default: "" },
  paypalSecret: { type: String, default: "" },
  paypalAccessToken: { type: String, default: "" },
};

/**
 * Subscription Schema
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
    type: mongoose.Schema.Types.ObjectId, // PHASE 1: Changed from String to ObjectId ref
    ref: "Tier", // Reference to Tier model
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
      values: ["stripe", "paypal", "free"],
      message: "Payment method must be stripe, paypal, or free",
    },
  },
  subscriptionPaymentId: String,
  subscriptionLimits: {
    leads: {
      type: Number,
      default: 0,
      validate: {
        validator: (v: number) => v >= 0,
        message: "Leads limit cannot be negative",
      },
    },
    twilioNumbers: {
      type: Number,
      default: 0,
      validate: {
        validator: (v: number) => v >= 0,
        message: "Twilio numbers limit cannot be negative",
      },
    },
    numbers: {
      type: Number,
      default: 0,
      validate: {
        validator: (v: number) => v >= 0,
        message: "Numbers limit cannot be negative",
      },
    },
    callSeconds: {
      type: Number,
      default: 0,
      validate: {
        validator: (v: number) => v >= 0,
        message: "Call seconds limit cannot be negative",
      },
    },
    forms: {
      type: Number,
      default: 0,
      validate: {
        validator: (v: number) => v >= 0,
        message: "Forms limit cannot be negative",
      },
    },
    buyers: {
      type: Number,
      default: 0,
      validate: {
        validator: (v: number) => v >= 0,
        message: "Buyers limit cannot be negative",
      },
    },
    exports: { type: Boolean, default: false },
    imports: { type: Boolean, default: false },
    liveSupport: { type: Boolean, default: false },
    industries: {
      type: Number,
      default: 0,
      validate: {
        validator: (v: number) => v >= 0,
        message: "Industries limit cannot be negative",
      },
    },
  },
  subscriptionUsage: {
    leads: {
      type: Number,
      default: 0,
      validate: {
        validator: (v: number) => v >= 0,
        message: "Leads usage cannot be negative",
      },
    },
    callSeconds: {
      type: Number,
      default: 0,
      validate: {
        validator: (v: number) => v >= 0,
        message: "Call seconds usage cannot be negative",
      },
    },
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
