import mongoose, { Schema, Document, Model, Types } from "mongoose";

// Define the interface for the Buyer document
export interface IBuyer extends Document {
  industries: any;
  _id: string;
  name: string;
  company: string;
  businessDescription?: string;
  companyRegNo?: string;
  vatTaxRegNo?: string;
  businessWebsite?: string;
  contactAddress?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postCode?: string;
  };
  priority: number; // 1-10 scale
  maxLeadsPerDay: number;
  isActive: boolean;
  currentLeads: number;
  currentLeadsToday: number;
  qualificationScoreMinimum: number;
  walletUnit: number;
  email: string;
  lastAssignedAt: Date;
  lastAssignedLeadId: string;
  phone: string;
  walletBalance: number;
  status: "new" | "active" | "inactive" | "suspended";
  preferredDistribution: "Automatic" | "Manual" | "Both";
  notificationPreferences: ("Email" | "SMS" | "In-App Notification")[];
  leadPreferences: {
    location: string;
    industries: string[]; // Preferred industries (multiple)
    industryServicePairs?: { industry: string; services: string[] }[]; // Industry with specific services
  };
  serviceLocations: {
    city: string;
    state: string;
    country: string;
    zipCodes?: string[]; // Optional array of zip codes
    radius?: number; // Service radius in miles
  }[];
  locationMatchingStrict: boolean; // If true, only accept leads from serviceLocations
  workingHours: {
    start: string; // "09:00"
    end: string; // "17:00"
  };
  timezone: string;

  // Operational Availability
  acceptOnlyDuringBusinessHours: boolean;
  vacationMode: {
    enabled: boolean;
    pauseUntil?: Date;
    autoReject: boolean; // Reject leads vs just don't notify
  };

  // Budget & Volume Limits (Period-based)
  budgetCapType: "daily" | "weekly" | "monthly";
  budgetLimitAmount: number; // Total budget for period
  volumeLimitCount: number; // Total lead count for period
  currentPeriodSpent: number; // Current period spending
  currentPeriodCount: number; // Current period lead count
  periodStartDate: Date; // Auto-reset tracking
  maxConcurrentLeads: number; // Max active leads at once

  // Advanced Location Preferences
  restrictedZones: {
    city?: string;
    state?: string;
    zipCodes?: string[];
  }[];
  preferredZones: {
    city?: string;
    state?: string;
    zipCodes?: string[];
  }[];
  radiusFlexibility: "strict" | "soft" | "flexible";

  // Overall Preference Matching Flexibility
  preferenceMatchingThreshold: "strict" | "moderate" | "flexible"; // Strict (70%), Moderate (50%), Flexible (20%)

  // Notification Enhancements
  notifyOnWeekends: boolean;

  // Weekly Schedule for Operational Availability
  weeklySchedule: {
    [key: string]: { enabled: boolean; start: string; end: string };
  };

  // Integration
  webhookConfig: {
    enabled: boolean;
    url: string;
    authToken: string;
  };

  // Lead Age/Freshness Preferences
  maxLeadAge: number; // Maximum lead age in hours (e.g., 1, 24, 48)

  // Geographic Radius Settings
  serviceRadius: number; // Radius in miles/km for geographic coverage

  // Contact Attempt Preferences
  preferredContactMethods: ("phone" | "email" | "sms")[]; // Preferred contact methods

  // Lead Duplication Prevention
  blockDuplicateLeads: boolean; // Block duplicate leads based on phone/email
  duplicateCheckWindow: number; // Days to check for duplicates (e.g., 30, 60, 90)

  // Feedback Settings
  enableLeadFeedback: boolean; // Enable quality feedback mechanism
  leadRatings: {
    leadId: string;
    rating: number; // 1-5 stars
    comment?: string;
    ratedAt: Date;
  }[];

  // Lead Priority Settings
  priorityBySource: { source: string; priority: number }[]; // Priority weights by source
  priorityByIndustry: { industry: string; priority: number }[]; // Priority weights by industry
  priorityByLocation: { location: string; priority: number }[]; // Priority weights by location

  purchaseHistory: {
    leadId: string;
    date: Date;
    amount: number;
    unit: number;
  }[];
  paymentHistory: {
    date: Date;
    amount: number;
    method: string;
  }[];
  feedback: {
    rating: number;
    comment: string;
  }[];
  registeredWith: mongoose.Types.ObjectId;
  leadTypes: ("exclusive" | "shared")[];
  maxPricePerLead: number;
  autoAcceptMatchingLeads: boolean;
  acceptCallLeads: boolean;
  excludedSources: string[];
  criteriaSets: IBuyerCriteriaSet[];
  activeCriteriaSetId?: Types.ObjectId | null;
  assignedLeads: Types.ObjectId[]; // PHASE 1: Array of Lead IDs assigned to this buyer (for efficient queries)
  purchasedLeads: Types.ObjectId[]; // PHASE 1: Array of Lead IDs purchased by this buyer (for efficient queries)
}

export interface IBuyerCriteriaSet {
  _id: Types.ObjectId;
  name: string;
  leadTypes: ("exclusive" | "shared")[];
  locations: {
    city: string;
    state?: string;
    country?: string;
    radius?: number;
    zipCodes?: string[];
  }[];
  industries: string[];
  maxPrice: number;
  dailyLimit: number;
  excludedSources: string[];
  autoAccept: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Define the Mongoose schema
const BuyerSchema: Schema = new Schema({
  name: { type: String, required: true }, // From Google
  company: { type: String, default: "" }, // Optional, can be updated later
  businessDescription: { type: String, default: "" },
  companyRegNo: { type: String, default: "" },
  vatTaxRegNo: { type: String, default: "" },
  businessWebsite: { type: String, default: "" },
  contactAddress: {
    addressLine1: { type: String, default: "" },
    addressLine2: { type: String, default: "" },
    city: { type: String, default: "" },
    postCode: { type: String, default: "" },
  },
  priority: { type: Number, required: true, min: 1, max: 10, default: 5 },
  isActive: { type: Boolean, required: true, default: true },
  currentLeads: { type: Number, required: true, default: 0 },
  walletUnit: { type: Number, required: true, default: 0 },
  email: { type: String, required: true, unique: true }, // From Google
  phone: { type: String, default: "" }, // Optional, not from Google auth
  walletBalance: { type: Number, required: true, default: 0 },
  maxLeadsPerDay: { type: Number, required: true, default: 10 },
  currentLeadsToday: { type: Number, required: true, default: 0 },
  qualificationScoreMinimum: { type: Number, required: true, default: 0 },
  lastAssignedAt: { type: Date, default: Date.now },
  lastAssignedLeadId: { type: String, default: "" },
  workingHours: {
    start: { type: String, default: "09:00" }, // Optional, can be updated later
    end: { type: String, default: "17:00" }, // Optional, can be updated later
  },
  timezone: { type: String, default: "America/New_York" },

  // Operational Availability
  acceptOnlyDuringBusinessHours: { type: Boolean, default: false },
  vacationMode: {
    enabled: { type: Boolean, default: false },
    pauseUntil: { type: Date },
    autoReject: { type: Boolean, default: true },
  },

  // Budget & Volume Limits (Period-based)
  budgetCapType: {
    type: String,
    enum: ["daily", "weekly", "monthly"],
    default: "daily",
  },
  budgetLimitAmount: { type: Number, default: 0 },
  volumeLimitCount: { type: Number, default: 0 },
  currentPeriodSpent: { type: Number, default: 0 },
  currentPeriodCount: { type: Number, default: 0 },
  periodStartDate: { type: Date, default: Date.now },
  maxConcurrentLeads: { type: Number, default: 10 },

  // Advanced Location Preferences
  restrictedZones: [
    {
      city: { type: String },
      state: { type: String },
      zipCodes: [{ type: String }],
    },
  ],
  preferredZones: [
    {
      city: { type: String },
      state: { type: String },
      zipCodes: [{ type: String }],
    },
  ],
  radiusFlexibility: {
    type: String,
    enum: ["strict", "soft", "flexible"],
    default: "strict",
  },

  preferenceMatchingThreshold: {
    type: String,
    enum: ["strict", "moderate", "flexible"],
    default: "moderate",
  },

  // Notification Enhancements
  notifyOnWeekends: { type: Boolean, default: true },

  // Weekly Schedule for Operational Availability
  weeklySchedule: {
    type: Map,
    of: {
      enabled: { type: Boolean, default: true },
      start: { type: String, default: "09:00" },
      end: { type: String, default: "17:00" },
    },
    default: {
      Monday: { enabled: true, start: "09:00", end: "17:00" },
      Tuesday: { enabled: true, start: "09:00", end: "17:00" },
      Wednesday: { enabled: true, start: "09:00", end: "17:00" },
      Thursday: { enabled: true, start: "09:00", end: "17:00" },
      Friday: { enabled: true, start: "09:00", end: "17:00" },
      Saturday: { enabled: false, start: "09:00", end: "17:00" },
      Sunday: { enabled: false, start: "09:00", end: "17:00" },
    },
  },

  // Integration
  webhookConfig: {
    enabled: { type: Boolean, default: false },
    url: { type: String, default: "" },
    authToken: { type: String, default: "" },
  },

  // Lead Age/Freshness Preferences
  maxLeadAge: { type: Number, default: 24 }, // Default 24 hours

  // Geographic Radius Settings
  serviceRadius: { type: Number, default: 25 }, // Default 25 miles

  // Contact Attempt Preferences
  preferredContactMethods: [
    {
      type: String,
      enum: ["phone", "email", "sms"],
    },
  ],

  // Lead Duplication Prevention
  blockDuplicateLeads: { type: Boolean, default: true },
  duplicateCheckWindow: { type: Number, default: 30 }, // Default 30 days

  // Feedback Settings
  enableLeadFeedback: { type: Boolean, default: true },
  leadRatings: [
    {
      leadId: { type: String },
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      ratedAt: { type: Date, default: Date.now },
    },
  ],

  // Lead Priority Settings
  priorityBySource: [
    {
      source: { type: String },
      priority: { type: Number, min: 1, max: 10, default: 5 },
    },
  ],
  priorityByIndustry: [
    {
      industry: { type: String },
      priority: { type: Number, min: 1, max: 10, default: 5 },
    },
  ],
  priorityByLocation: [
    {
      location: { type: String },
      priority: { type: Number, min: 1, max: 10, default: 5 },
    },
  ],

  preferredDistribution: {
    type: String,
    enum: ["Automatic", "Manual", "Both"],
    default: "Manual",
  },
  leadTypes: [
    {
      type: String,
      enum: ["exclusive", "shared"],
      default: "shared",
    },
  ],
  maxPricePerLead: { type: Number, default: 0 },
  autoAcceptMatchingLeads: { type: Boolean, default: false },
  acceptCallLeads: { type: Boolean, default: true },
  excludedSources: [{ type: String }],
  notificationPreferences: [
    {
      type: String,
      enum: ["Email", "SMS", "In-App Notification"],
    },
  ],
  status: {
    type: String,
    enum: ["new", "active", "inactive", "suspended"],
    default: "new",
  },
  leadPreferences: {
    location: { type: String, default: "" },
    industries: [{ type: String }], // Multiple preferred industries
    industryServicePairs: [
      {
        industry: { type: String },
        services: [{ type: String }],
      },
    ],
  },
  serviceLocations: [
    {
      city: { type: String, default: "" }, // Optional
      state: { type: String, default: "" }, // Optional
      country: { type: String, required: false, default: "USA" },
      zipCodes: [{ type: String }],
      radius: { type: Number, default: 25 }, // Default 25 miles radius
    },
  ],
  locationMatchingStrict: { type: Boolean, default: false },
  purchaseHistory: [
    {
      leadId: { type: String },
      date: { type: Date },
      amount: { type: Number },
      unit: { type: Number },
    },
  ],
  paymentHistory: [
    {
      date: { type: Date },
      amount: { type: Number },
      method: { type: String },
    },
  ],
  feedback: [
    {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
    },
  ],
  criteriaSets: [
    {
      _id: { type: Schema.Types.ObjectId, auto: true },
      name: { type: String, required: true },
      leadTypes: [
        {
          type: String,
          enum: ["exclusive", "shared"],
          default: "shared",
        },
      ],
      locations: [
        {
          city: { type: String, required: true },
          state: { type: String, default: "" },
          country: { type: String, default: "USA" },
          zipCodes: [{ type: String }],
          radius: { type: Number, default: 25 },
        },
      ],
      industries: [{ type: String }],
      maxPrice: { type: Number, default: 0 },
      dailyLimit: { type: Number, default: 5 },
      excludedSources: [{ type: String }],
      autoAccept: { type: Boolean, default: false },
      isDefault: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  ],
  activeCriteriaSetId: { type: Schema.Types.ObjectId, default: null },
  registeredWith: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false, // Optional - null for independent buyers, set for seller-registered buyers
    default: null,
  },
  isIndependentBuyer: {
    type: Boolean,
    default: true, // true = registered independently, false = pre-registered by seller
  },
  // PHASE 1: Bidirectional Lead References
  assignedLeads: [
    {
      type: Schema.Types.ObjectId,
      ref: "Lead", // Reference to Lead model
    },
  ],
  purchasedLeads: [
    {
      type: Schema.Types.ObjectId,
      ref: "Lead", // Reference to Lead model
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

BuyerSchema.index({ registeredWith: 1 }); // Index on registeredWith field
BuyerSchema.index({ assignedLeads: 1 }); // PHASE 1: Index on assignedLeads for fast queries
BuyerSchema.index({ purchasedLeads: 1 }); // PHASE 1: Index on purchasedLeads for fast queries

// Create and export the Mongoose model

export const Buyer: Model<IBuyer> =
  mongoose.models.Buyer || mongoose.model<IBuyer>("Buyer", BuyerSchema);
