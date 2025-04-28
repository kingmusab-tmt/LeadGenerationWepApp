import mongoose, { Schema, Document, Model } from "mongoose";

// TypeScript Interfaces

// Subscription interface
interface ISubscription {
  subscriptionTierId: string;
  subscriptionTierType: "free" | "paid"; // Subscription tier type (free or paid)
  subscriptionTierUserType: "seller" | "business"; // User type for the subscription tier
  subscriptionPlan:
    | "Free Tier"
    | "Lead Seller Tier"
    | "Business Tier"
    | "Premium Tier"; // Subscription plan name
  subscriptionPrice?: number; // Price of the   subscription plan
  subscriptionStartDate: Date; // when user signed up
  subscriptionExpiryDate: Date; // when Free Tier or Paid plan ends
  isSubscriptionActive: boolean; // true/false
  isTrial: boolean; // true if Free Tier trial is active
  subscriptionRenewalDate?: Date;
  subscriptionPaymentMethod: "stripe" | "paypal" | "manual";
  subscriptionPaymentId?: string; // Stripe/PayPal subscription ID
  subscriptionRenewalPrice?: number; // Renewal price for the subscription
  subscriptionLimits: {
    leads: number;
    buyers: number;
    numbers: number;
    callSeconds: number;
  };
  subscriptionUsage: {
    leads: number;
    callSeconds: number;
  };
}

interface ITrackingNumber {
  phoneNumber: string; // Tracking phone number
  industry: string; // Industry/niche
  forwardingType: string; // Forwarding type
  method: "Manual" | "Automatic"; // Method of number acquisition
  recordCall: boolean; // Call recording toggle
  reconnectCaller: boolean; // Reconnect caller toggle
  passCallerId: boolean; // Pass caller ID toggle
  leadSource: string; // Source of the call
  welcomeMessage: string; // Welcome message
  callWhisper: string; // Call whisper message
  requireResponse: boolean; // Require response toggle
  buyerResponses?: {
    // Messages and digits for buyer verification
    message: string;
    digit: string;
  }[];
  leadResponses?: {
    // Messages and digits for lead verification
    message: string;
    digit: string;
  }[];
  forwardingNumbers?: string[]; // Forwarding numbers (for "single_multiple")
  leadBuyers?: {
    // Lead buyers (for "specific_lead")
    id: string;
    name: string;
    phone: string;
  }[];
}

export interface IUser extends Document {
  username: string;
  name: string;
  email: string;
  businessName: string;
  loginlink: string;
  role: "admin" | "seller" | "buyer" | "user" | "business-admin" | "staff";
  image?: string;
  walletBalance: number;
  provider: string;
  notificationPreferences: ("email" | "sms" | "dashboard")[];
  mobileNumber: string;
  twilioActivated: boolean;
  twilioAccountSid: string;
  twilioAuthToken: string;
  pushToken: string;
  trackingNumbers: ITrackingNumber[];
  preferences?: Record<string, unknown>;
  status: "active" | "suspended";
  leadDistributionMethod: "manual" | "automatic";
  buyers: mongoose.Types.ObjectId[];
  lastAssignedIndex?: number;

  // Email Settings
  emailSettings: {
    emailAddress: string;
    mailDomain: string;
    smtpServer: string;
    smtpUser: string;
    smtpPassword: string;
    port: number;
    emailSubject: string;
    emailBody: string;
  };

  // API Settings
  apiSettings: {
    twilioSid: string;
    twilioAuthToken: string;
    twilioPhoneNumber: string;
  };

  // Credit Setup
  creditSetup: {
    stripeSecretKey: string;
    stripePublishableKey: string;
    stripeWebhookSecret: string;
    paypalClientId: string;
    paypalSecret: string;
    paypalAccessToken: string;
  };

  // **Unit Pricing Options** (New Field)
  unitPricingOptions: {
    units: number;
    cost: number;
  }[];
  callChargeOptions: {
    units: number;
    seconds: number;
  }[];

  subscription?: ISubscription;

  // Add billing history

  stripeCustomerId?: string;
  paypalCustomerId?: string;
}

interface INotification extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  type: "info" | "alert";
  message: string;
  status: "read" | "unread";
  createdAt?: Date;
}

// Mongoose Schemas and Models

// User Model
const UserSchema: Schema = new Schema<IUser>(
  {
    username: { type: String, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    businessName: { type: String },
    loginlink: { type: String },
    role: {
      type: String,
      enum: ["admin", "seller", "buyer", "user", "staff", "business-admin"],
      default: "user",
    },
    notificationPreferences: [
      {
        type: String,
        enum: ["email", "sms", "dashboard"],
      },
    ],
    image: { type: String },
    pushToken: { type: String },
    walletBalance: { type: Number },
    preferences: { type: Object },
    mobileNumber: { type: String },
    twilioActivated: { type: Boolean, default: false },
    trackingNumbers: [
      {
        phoneNumber: { type: String, required: true }, // Tracking phone number
        industry: { type: String, required: true }, // Industry/niche
        forwardingType: { type: String, required: true }, // Forwarding type
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
            message: { type: String, required: true },
            digit: { type: String, required: true },
          },
        ], // Messages and digits for buyer verification
        leadResponses: [
          {
            message: { type: String, required: true },
            digit: { type: String, required: true },
          },
        ], // Messages and digits for lead verification

        leadBuyers: [
          {
            id: { type: String, required: true }, // Lead buyer ID
            name: { type: String, required: true }, // Lead buyer name
            phone: { type: String, required: true },
          },
        ], // Lead buyers (for "specific_lead")
      },
    ],
    provider: { type: String, required: true },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    buyers: [{ type: Schema.Types.ObjectId, ref: "Buyer" }],
    lastAssignedIndex: { type: Number, default: 0 },
    leadDistributionMethod: {
      type: String,
      enum: ["manual", "automated"],
      default: "manual",
    },
    emailSettings: {
      emailAddress: { type: String },
      mailDomain: { type: String },
      smtpServer: { type: String },
      smtpUser: { type: String },
      smtpPassword: { type: String },
      port: { type: Number },
      emailSubject: { type: String },
      emailBody: { type: String },
    },
    apiSettings: {
      twilioSid: { type: String },
      twilioAuthToken: { type: String },
      twilioPhoneNumber: { type: String },
    },
    creditSetup: {
      stripeSecretKey: { type: String, default: "" },
      stripePublishableKey: { type: String, default: "" },
      stripeWebhookSecret: { type: String, default: "" },
      paypalClientId: { type: String, default: "" },
      paypalSecret: { type: String, default: "" },
      paypalAccessToken: { type: String, default: "" },
    },
    unitPricingOptions: [
      {
        units: { type: Number, required: true, min: 1 },
        cost: { type: Number, required: true, min: 0.01 },
      },
    ],
    callChargeOptions: [
      {
        units: { type: Number, required: true, min: 1 },
        seconds: { type: Number, required: true, min: 1 },
      },
    ],
    stripeCustomerId: { type: String },
    paypalCustomerId: { type: String },
    subscription: {
      subscriptionPlan: {
        type: String,
        enum: [
          "Free Tier",
          "Lead Seller Tier",
          "Business Tier",
          "Premium Tier",
        ],
        default: "Free",
      },
      subscriptionStartDate: {
        type: Date,
        default: Date.now,
      },
      subscriptionPrice: { type: Number },
      subscriptionExpiryDate: Date,
      isSubscriptionActive: { type: Boolean, default: false },
      isTrial: { type: Boolean, default: false },
      subscriptionRenewalDate: Date,
      subscriptionPaymentMethod: {
        type: String,
        enum: ["stripe", "paypal", "manual"],
      },
      subscriptionPaymentId: String,
      subscriptionLimits: {
        leads: { type: Number, default: 0 },
        buyers: { type: Number, default: 0 },
        numbers: { type: Number, default: 0 },
        callSeconds: { type: Number, default: 0 },
      },
      subscriptionUsage: {
        leads: { type: Number, default: 0 },
        callSeconds: { type: Number, default: 0 },
      },
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ buyers: 1 }); // Index on buyers array

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

// Notification Model
const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    type: { type: String, enum: ["info", "alert"], required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ["read", "unread"], default: "unread" },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
  }
);
export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
