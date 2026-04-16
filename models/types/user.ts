import mongoose, { Document } from "mongoose";
import { ISubscription } from "./subscription";

/**
 * Main User Interface
 * Core user document type for MongoDB
 */
export interface IUser extends Document {
  name: string;
  email: string;
  businessName: string;
  businessEmail?: string;
  businessPhone?: string;
  businessWebsite?: string;
  companyDescription?: string;
  industryNiche?: string;
  businessAddress?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    country?: string;
    postCode?: string;
  };
  loginlink: string;
  role: "admin" | "seller" | "buyer" | "user" | "business-admin" | "staff";
  image?: string;
  walletBalance: number;
  provider: string;
  notificationPreferences: ("Email" | "SMS" | "In-App Notification")[];
  mobileNumber: string;
  twilioActivated: boolean;
  twilioAccountSid: string;
  twilioAuthToken: string;
  tawkPropertyId: string;
  tawkWidgetId: string;
  pushToken: string;
  trackingNumbers: any[]; // ITrackingNumber[] - imported from tracking.ts
  preferences?: Record<string, unknown>;
  status: "active" | "suspended";
  buyers?: mongoose.Types.ObjectId[];
  leads?: mongoose.Types.ObjectId[];
  forms?: mongoose.Types.ObjectId[];
  lastAssignedIndex?: number;
  industryRoundRobinIndex?: Map<string, number>;
  /**
   * Seller distribution mode:
   * - "automatic": Auto-assign all qualified leads per method
   * - "marketplace": Do not auto-assign; leads remain available
   * - "both": Auto-assign only if aiQualityScore <= aiQualityThreshold
   */
  distributionMode?: "automatic" | "marketplace" | "both";
  /** AI quality spam score threshold (0-100, lower is better). Default 50 */
  aiQualityThreshold?: number;
  /** Post leads to marketplace if not auto-assigned */
  marketplaceFallback?: boolean;
  /** Unit pricing per quality level */
  leadPricing?: {
    high: number;
    medium: number;
    low: number;
  };
  autoAssignLeads?: boolean;
  maxAutoAssignPerDay?: number;
  currentAutoAssignedToday?: number;
  lastAutoAssignResetDate?: Date;

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

  holdMusicUrl?: string;

  subscription?: ISubscription | null;

  stripeAccountId?: string;
  stripeOnboarded?: boolean;
  stripeCustomerId?: string;

  tosAcceptance?: {
    accepted: boolean;
    acceptedAt?: Date;
    ipAddress?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
  lastLogin?: Date; // Last login timestamp
  verified?: boolean; // Verification status
}
