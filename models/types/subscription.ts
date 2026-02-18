import mongoose from "mongoose";

/**
 * Subscription Interface
 * Handles all subscription-related user data
 */
export interface ISubscription {
  subscriptionTierId: string;
  subscriptionTierType: "free" | "paid"; // Subscription tier type (free or paid)
  subscriptionTierUserType: "seller" | "business"; // User type for the subscription tier
  subscriptionPlan: string; // Subscription plan name
  subscriptionPrice?: number; // Price of the subscription plan
  subscriptionStartDate: Date; // when user signed up
  subscriptionExpiryDate: Date; // when Free Tier or Paid plan ends
  isSubscriptionActive: boolean; // true/false
  isTrial: boolean; // true if Free Tier trial is active
  usedTrial: boolean; // true if user has used their Free Tier trial
  subscriptionRenewalDate?: Date;
  subscriptionPaymentMethod: "stripe" | "free";
  subscriptionPaymentId?: string; // Legacy: Stripe checkout session ID
  stripeSubscriptionId?: string; // Stripe Subscription ID for recurring billing
  billingInterval?: "month" | "year"; // Current billing interval
  cancelAtPeriodEnd?: boolean; // Will subscription cancel at period end
  canceledAt?: Date; // When subscription was canceled
  paymentFailed?: boolean; // Whether last payment failed
  lastPaymentFailedAt?: Date; // When last payment failed
  subscriptionRenewalPrice?: number; // Renewal price for the subscription
  subscriptionLimits: ISubscriptionLimits;
  subscriptionUsage: ISubscriptionUsage;
}

/**
 * Granular Subscription Limits Interface
 * Defines all feature limitations per subscription tier
 */
export interface ISubscriptionLimits {
  // Core Limits
  forms: number; // Max number of lead capture forms
  leads: number; // Max leads per month (0 = unlimited)
  buyers: number; // Max registered buyers
  industries: number; // Max industries/niches

  // Call Tracking & Telephony
  numbers: number; // Max tracking numbers (manual)
  twilioNumbers: number; // Max Twilio numbers
  callSeconds: number; // Max call seconds per month (0 = unlimited)
  callRecording: boolean; // Enable call recording
  callTranscription: boolean; // Enable AI call transcription
  callAIAnalysis: boolean; // Enable AI call analysis (sentiment, scoring)
  multiRingForwarding: boolean; // Enable multi-ring call forwarding
  geoRouting: boolean; // Enable geo-based call routing
  scheduledCallbacks: boolean; // Enable scheduled callback feature
  concurrentCallLimit: number; // Max concurrent calls (0 = unlimited)

  // Marketing & Campaigns
  emailCampaignsEnabled: boolean; // Enable email campaigns feature (users provide their own SMTP)
  smsCampaignsPerMonth: number; // Max SMS campaigns per month (0 = unlimited)
  smsRecipientsPerCampaign: number; // Max recipients per SMS campaign
  smsPhoneNumbers: number; // Max Twilio phone numbers for SMS (allocated from twilioNumbers limit)

  // Automation & Workflows
  automationWorkflows: number; // Max active automation workflows
  automationActionsPerWorkflow: number; // Max actions per workflow

  // AI & Advanced Features
  chatbotEnabled: boolean; // Enable chatbot qualification
  leadScoringEnabled: boolean; // Enable AI lead scoring
  sentimentAnalysisEnabled: boolean; // Enable sentiment analysis
  aiSummariesEnabled: boolean; // Enable AI summaries

  // Invoicing & Payments
  invoicesPerMonth: number; // Max invoices per month (0 = unlimited)
  customInvoiceBranding: boolean; // Enable custom invoice branding

  // Integrations
  zapierIntegration: boolean; // Enable Zapier integration
  webhookIntegration: boolean; // Enable webhook integrations
  apiAccess: boolean; // Enable API access
  maxWebhooks: number; // Max webhook endpoints

  // Marketplace & Distribution
  marketplaceAccess: boolean; // Access to lead marketplace
  exclusiveLeads: boolean; // Can purchase/sell exclusive leads
  leadDistributionRules: boolean; // Enable advanced lead distribution rules

  // Data & Reporting
  exports: boolean; // Enable data exports
  imports: boolean; // Enable data imports
  advancedReports: boolean; // Enable advanced analytics/reports
  dataRetentionDays: number; // Data retention period (0 = unlimited)

  // Team & Access
  teamMembers: number; // Max team members/sub-accounts (0 = unlimited)
  maxConcurrentSessions: number; // Max concurrent login sessions per user

  // Support
  liveSupport: boolean; // Enable live chat support
  prioritySupport: boolean; // Enable priority support queue

  // Customization
  customBranding: boolean; // Enable white-label/custom branding
  customDomain: boolean; // Enable custom domain
}

/**
 * Subscription Usage Tracking Interface
 * Tracks current usage against limits
 */
export interface ISubscriptionUsage {
  // Core Usage
  leads: number; // Leads used this billing period
  callSeconds: number; // Call seconds used this billing period
  forms: number; // Active forms count
  buyers: number; // Registered buyers count

  // Campaign Usage
  smsCampaigns: number; // SMS campaigns sent this month

  // Automation Usage
  workflowExecutions: number; // Workflow executions this billing period

  // Invoice Usage
  invoices: number; // Invoices created this month

  // Team Usage
  activeSessions: number; // Current active sessions
  teamMembersCount: number; // Current team members

  // Reset tracking
  usagePeriodStart: Date; // Start of current billing/usage period
  usagePeriodEnd: Date; // End of current billing/usage period
}
