/**
 * Seed script to create subscription tiers for the Lead Generation platform
 * Run with: npx tsx --env-file=.env.local scripts/seedTiers.ts
 */

import mongoose from "mongoose";

// Tier Limits Interface
interface TierLimits {
  // Core Limits
  forms: number;
  leads: number;
  buyers: number;
  industries: number;

  // Call Tracking & Telephony
  numbers: number;
  twilioNumbers: number;
  callSeconds: number;
  callRecording: boolean;
  callTranscription: boolean;
  callAIAnalysis: boolean;
  multiRingForwarding: boolean;
  geoRouting: boolean;
  scheduledCallbacks: boolean;
  concurrentCallLimit: number;

  // Marketing & Campaigns
  emailCampaignsPerMonth: number;
  smsCampaignsPerMonth: number;
  emailRecipientsPerCampaign: number;
  smsRecipientsPerCampaign: number;

  // Automation & Workflows
  automationWorkflows: number;
  automationActionsPerWorkflow: number;

  // AI & Advanced Features
  chatbotEnabled: boolean;
  leadScoringEnabled: boolean;
  sentimentAnalysisEnabled: boolean;
  aiSummariesEnabled: boolean;

  // Invoicing & Payments
  invoicesPerMonth: number;
  customInvoiceBranding: boolean;

  // Integrations
  zapierIntegration: boolean;
  webhookIntegration: boolean;
  apiAccess: boolean;
  maxWebhooks: number;

  // Marketplace & Distribution
  marketplaceAccess: boolean;
  exclusiveLeads: boolean;
  leadDistributionRules: boolean;

  // Data & Reporting
  exports: boolean;
  imports: boolean;
  advancedReports: boolean;
  dataRetentionDays: number;

  // Team & Access
  teamMembers: number;
  maxConcurrentSessions: number;

  // Support
  liveSupport: boolean;
  prioritySupport: boolean;

  // Customization
  customBranding: boolean;
  customDomain: boolean;
}

interface TierData {
  name: string;
  price: string;
  description: string;
  features: string[];
  ctaText: string;
  highlight: boolean;
  isActive: boolean;
  order: number;
  tierType: "free" | "paid";
  tierUserType: "seller" | "business";
  discountPercentage: number;
  tierLimits: TierLimits;
}

// ============================================
// SELLER TIERS - For lead sellers/generators
// ============================================

const sellerFreeTier: TierData = {
  name: "Starter",
  price: "0",
  description:
    "Perfect for individuals just starting their lead generation journey. Get familiar with the platform and start capturing leads at no cost.",
  features: [
    "1 Lead capture form",
    "Up to 100 leads per month",
    "5 buyer connections",
    "1 industry focus",
    "Basic email notifications",
    "90-day data retention",
    "Community support",
  ],
  ctaText: "Start Free",
  highlight: false,
  isActive: true,
  order: 1,
  tierType: "free",
  tierUserType: "seller",
  discountPercentage: 0,
  tierLimits: {
    forms: 1,
    leads: 100,
    buyers: 5,
    industries: 1,
    numbers: 0,
    twilioNumbers: 0,
    callSeconds: 0,
    callRecording: false,
    callTranscription: false,
    callAIAnalysis: false,
    multiRingForwarding: false,
    geoRouting: false,
    scheduledCallbacks: false,
    concurrentCallLimit: 0,
    emailCampaignsPerMonth: 0,
    smsCampaignsPerMonth: 0,
    emailRecipientsPerCampaign: 0,
    smsRecipientsPerCampaign: 0,
    automationWorkflows: 0,
    automationActionsPerWorkflow: 0,
    chatbotEnabled: false,
    leadScoringEnabled: false,
    sentimentAnalysisEnabled: false,
    aiSummariesEnabled: false,
    invoicesPerMonth: 5,
    customInvoiceBranding: false,
    zapierIntegration: false,
    webhookIntegration: false,
    apiAccess: false,
    maxWebhooks: 0,
    marketplaceAccess: false,
    exclusiveLeads: false,
    leadDistributionRules: false,
    exports: false,
    imports: false,
    advancedReports: false,
    dataRetentionDays: 90,
    teamMembers: 1,
    maxConcurrentSessions: 1,
    liveSupport: false,
    prioritySupport: false,
    customBranding: false,
    customDomain: false,
  },
};

const sellerBasicTier: TierData = {
  name: "Basic",
  price: "29",
  description:
    "Ideal for solo lead generators ready to scale. Get essential tools to capture, manage, and sell more leads efficiently.",
  features: [
    "3 Lead capture forms",
    "Up to 500 leads per month",
    "25 buyer connections",
    "3 industry categories",
    "1 tracking phone number",
    "500 call minutes/month",
    "Basic call recording",
    "CSV data exports",
    "Email support",
    "180-day data retention",
  ],
  ctaText: "Get Started",
  highlight: false,
  isActive: true,
  order: 2,
  tierType: "paid",
  tierUserType: "seller",
  discountPercentage: 10,
  tierLimits: {
    forms: 3,
    leads: 500,
    buyers: 25,
    industries: 3,
    numbers: 1,
    twilioNumbers: 1,
    callSeconds: 30000, // 500 minutes
    callRecording: true,
    callTranscription: false,
    callAIAnalysis: false,
    multiRingForwarding: false,
    geoRouting: false,
    scheduledCallbacks: false,
    concurrentCallLimit: 2,
    emailCampaignsPerMonth: 2,
    smsCampaignsPerMonth: 0,
    emailRecipientsPerCampaign: 250,
    smsRecipientsPerCampaign: 0,
    automationWorkflows: 1,
    automationActionsPerWorkflow: 3,
    chatbotEnabled: false,
    leadScoringEnabled: false,
    sentimentAnalysisEnabled: false,
    aiSummariesEnabled: false,
    invoicesPerMonth: 25,
    customInvoiceBranding: false,
    zapierIntegration: false,
    webhookIntegration: false,
    apiAccess: false,
    maxWebhooks: 0,
    marketplaceAccess: true,
    exclusiveLeads: false,
    leadDistributionRules: false,
    exports: true,
    imports: false,
    advancedReports: false,
    dataRetentionDays: 180,
    teamMembers: 1,
    maxConcurrentSessions: 2,
    liveSupport: false,
    prioritySupport: false,
    customBranding: false,
    customDomain: false,
  },
};

const sellerProfessionalTier: TierData = {
  name: "Professional",
  price: "79",
  description:
    "Built for growing lead generation businesses. Unlock automation, AI insights, and advanced marketing tools to maximize your revenue.",
  features: [
    "10 Lead capture forms",
    "Up to 2,500 leads per month",
    "100 buyer connections",
    "Unlimited industries",
    "3 tracking phone numbers",
    "2,000 call minutes/month",
    "Call recording & transcription",
    "AI call analysis",
    "5 email campaigns/month",
    "2 SMS campaigns/month",
    "3 automation workflows",
    "Lead scoring",
    "Zapier integration",
    "Webhook access (3 webhooks)",
    "CSV & Excel exports/imports",
    "Advanced analytics",
    "Live chat support",
    "1-year data retention",
  ],
  ctaText: "Go Professional",
  highlight: true,
  isActive: true,
  order: 3,
  tierType: "paid",
  tierUserType: "seller",
  discountPercentage: 15,
  tierLimits: {
    forms: 10,
    leads: 2500,
    buyers: 100,
    industries: 999, // Unlimited
    numbers: 3,
    twilioNumbers: 3,
    callSeconds: 120000, // 2000 minutes
    callRecording: true,
    callTranscription: true,
    callAIAnalysis: true,
    multiRingForwarding: true,
    geoRouting: false,
    scheduledCallbacks: true,
    concurrentCallLimit: 5,
    emailCampaignsPerMonth: 5,
    smsCampaignsPerMonth: 2,
    emailRecipientsPerCampaign: 1000,
    smsRecipientsPerCampaign: 500,
    automationWorkflows: 3,
    automationActionsPerWorkflow: 10,
    chatbotEnabled: true,
    leadScoringEnabled: true,
    sentimentAnalysisEnabled: true,
    aiSummariesEnabled: true,
    invoicesPerMonth: 100,
    customInvoiceBranding: false,
    zapierIntegration: true,
    webhookIntegration: true,
    apiAccess: false,
    maxWebhooks: 3,
    marketplaceAccess: true,
    exclusiveLeads: false,
    leadDistributionRules: true,
    exports: true,
    imports: true,
    advancedReports: true,
    dataRetentionDays: 365,
    teamMembers: 3,
    maxConcurrentSessions: 5,
    liveSupport: true,
    prioritySupport: false,
    customBranding: false,
    customDomain: false,
  },
};

const sellerEnterpriseTier: TierData = {
  name: "Enterprise",
  price: "199",
  description:
    "The ultimate solution for high-volume lead generation agencies. Full platform access with premium features, unlimited capacity, and white-glove support.",
  features: [
    "Unlimited lead capture forms",
    "Unlimited leads",
    "Unlimited buyer connections",
    "Unlimited industries",
    "10 tracking phone numbers",
    "10,000 call minutes/month",
    "Full call AI suite",
    "Geo-routing & multi-ring",
    "Unlimited email campaigns",
    "10 SMS campaigns/month",
    "Unlimited automation workflows",
    "Advanced lead scoring & AI",
    "Full API access",
    "Unlimited webhooks",
    "Custom branding",
    "Custom domain",
    "10 team members",
    "Priority support",
    "Dedicated account manager",
    "Unlimited data retention",
    "Custom integrations",
  ],
  ctaText: "Contact Sales",
  highlight: false,
  isActive: true,
  order: 4,
  tierType: "paid",
  tierUserType: "seller",
  discountPercentage: 20,
  tierLimits: {
    forms: 999999, // Unlimited
    leads: 999999, // Unlimited
    buyers: 999999, // Unlimited
    industries: 999999, // Unlimited
    numbers: 10,
    twilioNumbers: 10,
    callSeconds: 600000, // 10000 minutes
    callRecording: true,
    callTranscription: true,
    callAIAnalysis: true,
    multiRingForwarding: true,
    geoRouting: true,
    scheduledCallbacks: true,
    concurrentCallLimit: 20,
    emailCampaignsPerMonth: 999999, // Unlimited
    smsCampaignsPerMonth: 10,
    emailRecipientsPerCampaign: 10000,
    smsRecipientsPerCampaign: 2000,
    automationWorkflows: 999999, // Unlimited
    automationActionsPerWorkflow: 50,
    chatbotEnabled: true,
    leadScoringEnabled: true,
    sentimentAnalysisEnabled: true,
    aiSummariesEnabled: true,
    invoicesPerMonth: 999999, // Unlimited
    customInvoiceBranding: true,
    zapierIntegration: true,
    webhookIntegration: true,
    apiAccess: true,
    maxWebhooks: 999999, // Unlimited
    marketplaceAccess: true,
    exclusiveLeads: true,
    leadDistributionRules: true,
    exports: true,
    imports: true,
    advancedReports: true,
    dataRetentionDays: 99999, // Unlimited
    teamMembers: 10,
    maxConcurrentSessions: 20,
    liveSupport: true,
    prioritySupport: true,
    customBranding: true,
    customDomain: true,
  },
};

// ============================================
// BUSINESS TIERS - For lead buyers/businesses
// ============================================

const businessStarterTier: TierData = {
  name: "Business Starter",
  price: "0",
  description:
    "Get started purchasing leads for your business. Access the marketplace and make your first connections without any commitment.",
  features: [
    "Access to lead marketplace",
    "Up to 10 lead purchases/month",
    "Basic lead filtering",
    "Email notifications",
    "Standard support",
    "90-day data retention",
  ],
  ctaText: "Join Free",
  highlight: false,
  isActive: true,
  order: 5,
  tierType: "free",
  tierUserType: "business",
  discountPercentage: 0,
  tierLimits: {
    forms: 0,
    leads: 10,
    buyers: 0,
    industries: 1,
    numbers: 0,
    twilioNumbers: 0,
    callSeconds: 0,
    callRecording: false,
    callTranscription: false,
    callAIAnalysis: false,
    multiRingForwarding: false,
    geoRouting: false,
    scheduledCallbacks: false,
    concurrentCallLimit: 0,
    emailCampaignsPerMonth: 0,
    smsCampaignsPerMonth: 0,
    emailRecipientsPerCampaign: 0,
    smsRecipientsPerCampaign: 0,
    automationWorkflows: 0,
    automationActionsPerWorkflow: 0,
    chatbotEnabled: false,
    leadScoringEnabled: false,
    sentimentAnalysisEnabled: false,
    aiSummariesEnabled: false,
    invoicesPerMonth: 10,
    customInvoiceBranding: false,
    zapierIntegration: false,
    webhookIntegration: false,
    apiAccess: false,
    maxWebhooks: 0,
    marketplaceAccess: true,
    exclusiveLeads: false,
    leadDistributionRules: false,
    exports: false,
    imports: false,
    advancedReports: false,
    dataRetentionDays: 90,
    teamMembers: 1,
    maxConcurrentSessions: 1,
    liveSupport: false,
    prioritySupport: false,
    customBranding: false,
    customDomain: false,
  },
};

const businessGrowthTier: TierData = {
  name: "Business Growth",
  price: "49",
  description:
    "For businesses ready to grow with quality leads. Get priority access to the marketplace and tools to manage your lead pipeline effectively.",
  features: [
    "Priority marketplace access",
    "Up to 100 lead purchases/month",
    "Advanced filtering & search",
    "Lead quality scores visible",
    "Auto-accept rules (2)",
    "CRM integration basics",
    "1 tracking number",
    "250 call minutes",
    "Data exports",
    "Email support",
    "180-day data retention",
  ],
  ctaText: "Grow Your Business",
  highlight: false,
  isActive: true,
  order: 6,
  tierType: "paid",
  tierUserType: "business",
  discountPercentage: 10,
  tierLimits: {
    forms: 0,
    leads: 100,
    buyers: 0,
    industries: 3,
    numbers: 1,
    twilioNumbers: 1,
    callSeconds: 15000, // 250 minutes
    callRecording: true,
    callTranscription: false,
    callAIAnalysis: false,
    multiRingForwarding: false,
    geoRouting: false,
    scheduledCallbacks: false,
    concurrentCallLimit: 2,
    emailCampaignsPerMonth: 2,
    smsCampaignsPerMonth: 0,
    emailRecipientsPerCampaign: 500,
    smsRecipientsPerCampaign: 0,
    automationWorkflows: 2,
    automationActionsPerWorkflow: 5,
    chatbotEnabled: false,
    leadScoringEnabled: true,
    sentimentAnalysisEnabled: false,
    aiSummariesEnabled: false,
    invoicesPerMonth: 50,
    customInvoiceBranding: false,
    zapierIntegration: false,
    webhookIntegration: true,
    apiAccess: false,
    maxWebhooks: 1,
    marketplaceAccess: true,
    exclusiveLeads: false,
    leadDistributionRules: true,
    exports: true,
    imports: false,
    advancedReports: false,
    dataRetentionDays: 180,
    teamMembers: 2,
    maxConcurrentSessions: 3,
    liveSupport: false,
    prioritySupport: false,
    customBranding: false,
    customDomain: false,
  },
};

const businessPremiumTier: TierData = {
  name: "Business Premium",
  price: "129",
  description:
    "For businesses serious about lead acquisition. Get exclusive lead access, advanced automation, and full integration capabilities to close more deals.",
  features: [
    "Exclusive lead access",
    "Up to 500 lead purchases/month",
    "AI-enhanced lead matching",
    "Auto-accept rules (10)",
    "Full CRM integrations",
    "Zapier & webhook access",
    "3 tracking numbers",
    "1,000 call minutes",
    "Call recording & transcription",
    "5 automation workflows",
    "Sentiment analysis",
    "Advanced reporting",
    "Live chat support",
    "1-year data retention",
    "3 team members",
  ],
  ctaText: "Go Premium",
  highlight: true,
  isActive: true,
  order: 7,
  tierType: "paid",
  tierUserType: "business",
  discountPercentage: 15,
  tierLimits: {
    forms: 0,
    leads: 500,
    buyers: 0,
    industries: 999, // Unlimited
    numbers: 3,
    twilioNumbers: 3,
    callSeconds: 60000, // 1000 minutes
    callRecording: true,
    callTranscription: true,
    callAIAnalysis: true,
    multiRingForwarding: true,
    geoRouting: false,
    scheduledCallbacks: true,
    concurrentCallLimit: 5,
    emailCampaignsPerMonth: 5,
    smsCampaignsPerMonth: 2,
    emailRecipientsPerCampaign: 2000,
    smsRecipientsPerCampaign: 500,
    automationWorkflows: 5,
    automationActionsPerWorkflow: 15,
    chatbotEnabled: true,
    leadScoringEnabled: true,
    sentimentAnalysisEnabled: true,
    aiSummariesEnabled: true,
    invoicesPerMonth: 200,
    customInvoiceBranding: false,
    zapierIntegration: true,
    webhookIntegration: true,
    apiAccess: false,
    maxWebhooks: 5,
    marketplaceAccess: true,
    exclusiveLeads: true,
    leadDistributionRules: true,
    exports: true,
    imports: true,
    advancedReports: true,
    dataRetentionDays: 365,
    teamMembers: 3,
    maxConcurrentSessions: 5,
    liveSupport: true,
    prioritySupport: false,
    customBranding: false,
    customDomain: false,
  },
};

const businessEnterpriseTier: TierData = {
  name: "Business Enterprise",
  price: "349",
  description:
    "Enterprise-grade lead acquisition for large organizations. Unlimited capacity, dedicated support, and complete platform customization.",
  features: [
    "Unlimited lead purchases",
    "First-access to premium leads",
    "Custom lead matching AI",
    "Unlimited auto-accept rules",
    "Full API access",
    "Custom integrations",
    "10 tracking numbers",
    "Unlimited call minutes",
    "Full AI call suite",
    "Unlimited automation",
    "White-label options",
    "Custom domain",
    "20 team members",
    "Priority support 24/7",
    "Dedicated success manager",
    "Custom SLA",
    "Unlimited data retention",
  ],
  ctaText: "Contact Sales",
  highlight: false,
  isActive: true,
  order: 8,
  tierType: "paid",
  tierUserType: "business",
  discountPercentage: 20,
  tierLimits: {
    forms: 0,
    leads: 999999, // Unlimited
    buyers: 0,
    industries: 999999, // Unlimited
    numbers: 10,
    twilioNumbers: 10,
    callSeconds: 999999, // Unlimited
    callRecording: true,
    callTranscription: true,
    callAIAnalysis: true,
    multiRingForwarding: true,
    geoRouting: true,
    scheduledCallbacks: true,
    concurrentCallLimit: 50,
    emailCampaignsPerMonth: 999999, // Unlimited
    smsCampaignsPerMonth: 999999, // Unlimited
    emailRecipientsPerCampaign: 50000,
    smsRecipientsPerCampaign: 10000,
    automationWorkflows: 999999, // Unlimited
    automationActionsPerWorkflow: 100,
    chatbotEnabled: true,
    leadScoringEnabled: true,
    sentimentAnalysisEnabled: true,
    aiSummariesEnabled: true,
    invoicesPerMonth: 999999, // Unlimited
    customInvoiceBranding: true,
    zapierIntegration: true,
    webhookIntegration: true,
    apiAccess: true,
    maxWebhooks: 999999, // Unlimited
    marketplaceAccess: true,
    exclusiveLeads: true,
    leadDistributionRules: true,
    exports: true,
    imports: true,
    advancedReports: true,
    dataRetentionDays: 99999, // Unlimited
    teamMembers: 20,
    maxConcurrentSessions: 50,
    liveSupport: true,
    prioritySupport: true,
    customBranding: true,
    customDomain: true,
  },
};

// All tiers to seed
const allTiers: TierData[] = [
  // Seller tiers
  sellerFreeTier,
  sellerBasicTier,
  sellerProfessionalTier,
  sellerEnterpriseTier,
  // Business tiers
  businessStarterTier,
  businessGrowthTier,
  businessPremiumTier,
  businessEnterpriseTier,
];

// Tier Schema (inline for script)
const TierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: String, required: true },
    description: { type: String, required: true },
    features: { type: [String], required: true },
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
    discountPercentage: { type: Number, default: 0 },
    discountedPrice: { type: String },
    renewalPrice: { type: String },
    annualPrice: { type: String },
    tierLimits: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

const Tier =
  mongoose.models.Tier || mongoose.model("Tier", TierSchema, "tiers");

async function seedTiers() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Optional: Clear existing tiers (uncomment if you want to replace all)
    // await Tier.deleteMany({});
    // console.log("Cleared existing tiers");

    console.log("\nSeeding tiers...\n");

    for (const tierData of allTiers) {
      // Calculate discounted and annual prices
      const price = parseFloat(tierData.price);
      const discountedMonthlyPrice =
        price > 0
          ? (price - (price * tierData.discountPercentage) / 100 / 12).toFixed(
              2,
            )
          : "0";
      const annualPrice =
        price > 0 ? (parseFloat(discountedMonthlyPrice) * 12).toFixed(2) : "0";
      const renewalPrice = price > 0 ? (price * 12).toFixed(2) : "0";

      const tierToCreate = {
        ...tierData,
        discountedPrice: discountedMonthlyPrice,
        annualPrice,
        renewalPrice,
      };

      // Check if tier already exists
      const existingTier = await Tier.findOne({
        name: tierData.name,
        tierUserType: tierData.tierUserType,
      });

      if (existingTier) {
        // Update existing tier
        await Tier.findByIdAndUpdate(existingTier._id, tierToCreate);
        console.log(
          `✓ Updated: ${tierData.name} (${tierData.tierUserType}) - $${tierData.price}/mo`,
        );
      } else {
        // Create new tier
        await Tier.create(tierToCreate);
        console.log(
          `✓ Created: ${tierData.name} (${tierData.tierUserType}) - $${tierData.price}/mo`,
        );
      }
    }

    console.log("\n✅ Tier seeding completed successfully!");
    console.log(`Total tiers: ${allTiers.length}`);
    console.log(
      `  - Seller tiers: ${allTiers.filter((t) => t.tierUserType === "seller").length}`,
    );
    console.log(
      `  - Business tiers: ${allTiers.filter((t) => t.tierUserType === "business").length}`,
    );
  } catch (error) {
    console.error("Error seeding tiers:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

// Run the seed
seedTiers();
