import mongoose, { Schema, Model } from "mongoose";
import { IUser } from "./types/user";
import {
  TrackingNumberSchema,
  EmailSettingsSchema,
  ApiSettingsSchema,
  CreditSetupSchema,
  SubscriptionSchema,
  UnitPricingSchema,
  CallChargeSchema,
} from "./schemas/schemas";

/**
 * User Schema
 * Main MongoDB schema for User documents
 */
const UserSchema: Schema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      validate: {
        validator: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: "Invalid email format",
      },
    },
    businessName: {
      type: String,
      maxlength: [150, "Business name cannot exceed 150 characters"],
    },
    businessEmail: {
      type: String,
      lowercase: true,
      validate: {
        validator: (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: "Invalid business email format",
      },
    },
    businessPhone: {
      type: String,
      validate: {
        validator: (v: string) => !v || /^\+?[1-9]\d{1,14}$/.test(v),
        message: "Invalid business phone format",
      },
    },
    businessWebsite: {
      type: String,
      validate: {
        validator: (v: string) => !v || /^https?:\/\/.+/.test(v),
        message: "Invalid business website URL",
      },
    },
    companyDescription: {
      type: String,
      maxlength: [1000, "Company description cannot exceed 1000 characters"],
    },
    industryNiche: {
      type: String,
      maxlength: [120, "Industry/Niche cannot exceed 120 characters"],
    },
    businessAddress: {
      addressLine1: { type: String, maxlength: 150 },
      addressLine2: { type: String, maxlength: 150 },
      city: { type: String, maxlength: 80 },
      state: { type: String, maxlength: 80 },
      country: { type: String, maxlength: 80 },
      postCode: { type: String, maxlength: 20 },
    },
    loginlink: {
      type: String,
      validate: {
        validator: (v: string) => !v || /^https?:\/\/.+/.test(v),
        message: "Invalid URL format for login link",
      },
    },
    role: {
      type: String,
      enum: {
        values: ["admin", "seller", "buyer", "user", "staff", "business-admin"],
        message: "Invalid role type",
      },
      default: "user",
    },
    // Only meaningful when role === "admin". Defaults to "super" so every
    // existing admin keeps today's full access — this is an opt-in
    // restriction a super-admin can apply to another admin, not a
    // retroactive lockout.
    adminLevel: {
      type: String,
      enum: {
        values: ["standard", "super"],
        message: "Invalid admin level",
      },
      default: "super",
    },
    // Currency this account bills/gets paid in. Sellers set this from their
    // business country; buyers inherit it for credit purchases from their
    // seller. See lib/currency.ts for the supported set (usd/gbp/cad).
    billingCurrency: {
      type: String,
      enum: {
        values: ["usd", "gbp", "cad"],
        message: "Invalid billing currency",
      },
      default: "usd",
    },
    notificationPreferences: {
      type: [String],
      enum: ["Email", "SMS", "In-App Notification"],
      default: ["Email"],
      set: (values: string[]) =>
        (values || []).map((value) => {
          const normalized = String(value || "")
            .trim()
            .toLowerCase();
          if (normalized === "email") return "Email";
          if (normalized === "sms") return "SMS";
          if (normalized === "dashboard" || normalized === "push") {
            return "In-App Notification";
          }
          return value;
        }),
    },
    image: { type: String },
    pushToken: { type: String },
    walletBalance: {
      type: Number,
      default: 0,
      validate: {
        validator: (v: number) => v >= 0,
        message: "Wallet balance cannot be negative",
      },
    },
    preferences: { type: Object },
    mobileNumber: {
      type: String,
      validate: {
        validator: (v: string) => !v || /^\+?[1-9]\d{1,14}$/.test(v),
        message: "Invalid phone number format",
      },
    },
    tawkPropertyId: { type: String, default: "" },
    tawkWidgetId: { type: String, default: "" },
    twilioActivated: { type: Boolean, default: false },
    twilioAccountSid: {
      type: String,
      validate: {
        validator: (v: string) => !v || /^AC[a-z0-9]{32}$/i.test(v),
        message: "Invalid Twilio Account SID format",
      },
    },
    twilioAuthToken: {
      type: String,
      minlength: [32, "Twilio Auth Token must be at least 32 characters"],
    },
    autoAssignLeads: {
      type: Boolean,
      default: false, // Disabled by default for manual review
    },
    maxAutoAssignPerDay: {
      type: Number,
      default: 50,
      min: 0,
    },
    currentAutoAssignedToday: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastAutoAssignResetDate: {
      type: Date,
      default: () => new Date(),
    },
    trackingNumbers: [TrackingNumberSchema],
    provider: {
      type: String,
      required: [true, "Provider is required"],
      enum: {
        values: ["google", "github", "credentials", "custom"],
        message: "Invalid provider type",
      },
    },
    status: {
      type: String,
      enum: {
        values: ["active", "suspended"],
        message: "Status must be active or suspended",
      },
      default: "active",
    },
    buyers: [{ type: Schema.Types.ObjectId, ref: "Buyer" }],
    leads: [{ type: Schema.Types.ObjectId, ref: "Lead" }],
    forms: [{ type: Schema.Types.ObjectId, ref: "Form" }],
    lastAssignedIndex: { type: Number, default: 0 },
    industryRoundRobinIndex: { type: Map, of: Number, default: new Map() },
    // Distribution Mode
    // - "automatic": Auto-assign all qualified leads
    // - "marketplace": Do not auto-assign; leads go to marketplace
    // - "both": Auto-assign only if aiQualityScore <= aiQualityThreshold
    distributionMode: {
      type: String,
      enum: {
        values: ["automatic", "marketplace", "both"],
        message: "Distribution mode must be automatic, marketplace, or both",
      },
      default: "marketplace",
    },
    aiQualityThreshold: {
      // Lower score is better; AI spam/quality score 0-100
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    marketplaceFallback: {
      type: Boolean,
      default: true,
    },
    leadPricing: {
      high: { type: Number, default: 10, min: 0 },
      medium: { type: Number, default: 5, min: 0 },
      low: { type: Number, default: 2, min: 0 },
    },
    emailSettings: EmailSettingsSchema,
    apiSettings: ApiSettingsSchema,
    stripeAccountId: { type: String },
    stripeOnboarded: { type: Boolean, default: false },
    onboardingProgress: {
      completedSteps: { type: [String], default: [] },
      skippedSteps: { type: [String], default: [] },
    },
    tosAcceptance: {
      accepted: { type: Boolean, default: false },
      acceptedAt: { type: Date },
      ipAddress: { type: String },
    },
    creditSetup: CreditSetupSchema,
    unitPricingOptions: UnitPricingSchema,
    callChargeOptions: CallChargeSchema,
    holdMusicUrl: { type: String, default: "" },
    stripeCustomerId: { type: String },
    subscription: SubscriptionSchema,
  },
  {
    timestamps: true,
  },
);

/**
 * Database Indexes
 * Optimizes queries on frequently accessed fields
 * Note: email already has a unique index defined at field level
 */

// Role-based queries
UserSchema.index({ role: 1 }); // Find all users by role
UserSchema.index({ role: 1, status: 1 }); // Find active users by role
UserSchema.index({ status: 1 }); // Find active/suspended users

// Subscription queries
UserSchema.index({ "subscription.subscriptionTierId": 1 }); // Find users by subscription tier (PHASE 1: Now ObjectId ref)
UserSchema.index({ "subscription.isSubscriptionActive": 1 }); // Find users with active subscriptions
UserSchema.index({
  "subscription.subscriptionExpiryDate": 1,
}); // Find expiring subscriptions

// Lead distribution queries
UserSchema.index({ distributionMode: 1 }); // Find users by distribution mode
UserSchema.index({ buyers: 1 }); // Find users by assigned buyers
UserSchema.index({ leads: 1 }); // PHASE 2: Find users by leads
UserSchema.index({ forms: 1 }); // PHASE 2: Find users by forms

// Tracking and Twilio queries
UserSchema.index({ twilioActivated: 1 }); // Find users with Twilio activated
UserSchema.index({ "trackingNumbers.phoneNumber": 1 }); // Find user by tracking number

// Provider/authentication queries
UserSchema.index({ provider: 1 }); // Find users by authentication provider
UserSchema.index({ "subscription.subscriptionPaymentMethod": 1 }); // Find users by payment method

// Stripe/Payment queries
UserSchema.index({ stripeCustomerId: 1 }); // Find user by Stripe customer ID
UserSchema.index({ stripeAccountId: 1 }); // Find user by Stripe account ID

// Timestamp indexes for sorting
UserSchema.index({ createdAt: -1 }); // Recently created users
UserSchema.index({ updatedAt: -1 }); // Recently updated users

// Auto-assignment indexes
UserSchema.index({ autoAssignLeads: 1 }); // Find users with auto-assign enabled
UserSchema.index({ lastAutoAssignResetDate: -1 }); // Find users needing daily reset

// Compound indexes for common queries
UserSchema.index({ role: 1, createdAt: -1 }); // Users by role, sorted by creation date
UserSchema.index({
  status: 1,
  "subscription.isSubscriptionActive": 1,
}); // Active users with active subscriptions
UserSchema.index({
  "subscription.subscriptionExpiryDate": 1,
  status: 1,
}); // Expiring subscriptions for active users

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
