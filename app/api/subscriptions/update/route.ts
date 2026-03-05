import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { Tier } from "@/models/tier";
import { z, ZodError } from "zod";
import {
  successResponse,
  unauthorized,
  badRequest,
  notFound,
  internalError,
  handleValidationError,
} from "@/lib/api/error-handler";
import {
  invalidateSessionCache,
  invalidateAllUserSessions,
} from "@/lib/cachedSession";

// Validation schema for subscription update
const createSubscriptionSchema = z.object({
  tierId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid tier ID format"),
  planName: z.string().min(1, "Plan name is required"),
  price: z.number().min(0, "Price must be >= 0").optional(),
  tierType: z.literal("paid", {
    message: "This endpoint only supports paid tier subscriptions",
  }),
  subscriptionYears: z
    .number()
    .min(1, "Subscription years must be >= 1")
    .default(1),
});

/**
 * POST /api/subscriptions/update
 * Update user subscription with new tier
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return badRequest("Invalid JSON in request body");
    }

    let validatedData;
    try {
      validatedData = await createSubscriptionSchema.parseAsync(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid subscription data");
    }

    // Validate price requirement for paid tiers
    if (validatedData.tierType === "paid" && !validatedData.price) {
      return badRequest("Price is required for paid tier subscriptions");
    }

    await dbConnect();

    // Get the current user to check existing subscription status
    const currentUser = await User.findById(session.user.id).select(
      "subscription",
    );
    if (!currentUser) {
      return notFound("User not found");
    }

    // Get the tier details to access the limits
    const tier = await Tier.findById(validatedData.tierId).lean();
    if (!tier) {
      return notFound("Tier not found");
    }

    // Calculate subscription dates
    const startDate = new Date();
    const expiryDate = new Date(startDate);

    expiryDate.setFullYear(
      expiryDate.getFullYear() + validatedData.subscriptionYears,
    );

    // Prepare subscription update data
    const subscriptionUpdate = {
      "subscription.subscriptionPlan": validatedData.planName,
      "subscription.subscriptionStartDate": startDate,
      "subscription.subscriptionExpiryDate": expiryDate,
      "subscription.isSubscriptionActive": true,
      "subscription.isTrial": false,
      "subscription.usedTrial": currentUser.subscription?.usedTrial || false,
      "subscription.subscriptionPaymentMethod": "paid",
      "subscription.subscriptionTierId": validatedData.tierId,
      "subscription.subscriptionTierType": validatedData.tierType,
      "subscription.subscriptionPrice": validatedData.price || 0,
      "subscription.subscriptionTierUserType": tier.tierUserType || "seller",
      "subscription.subscriptionLimits": {
        // Core Limits
        forms: tier.tierLimits?.forms || 1,
        leads: tier.tierLimits?.leads || 100,
        buyers: tier.tierLimits?.buyers || 5,
        industries: tier.tierLimits?.industries || 1,

        // Call Tracking & Telephony
        numbers: tier.tierLimits?.numbers || 1,
        twilioNumbers: tier.tierLimits?.twilioNumbers || 0,
        callSeconds: tier.tierLimits?.callSeconds || 1000,
        callRecording: tier.tierLimits?.callRecording || false,
        callTranscription: tier.tierLimits?.callTranscription || false,
        callAIAnalysis: tier.tierLimits?.callAIAnalysis || false,
        multiRingForwarding: tier.tierLimits?.multiRingForwarding || false,
        geoRouting: tier.tierLimits?.geoRouting || false,
        scheduledCallbacks: tier.tierLimits?.scheduledCallbacks || false,
        concurrentCallLimit: tier.tierLimits?.concurrentCallLimit || 1,

        // Marketing & Campaigns
        emailCampaignsEnabled: tier.tierLimits?.emailCampaignsEnabled || false,
        smsCampaignsPerMonth: tier.tierLimits?.smsCampaignsPerMonth || 0,
        smsRecipientsPerCampaign:
          tier.tierLimits?.smsRecipientsPerCampaign || 50,
        smsPhoneNumbers: tier.tierLimits?.smsPhoneNumbers || 0,

        // Automation & Workflows
        automationWorkflows: tier.tierLimits?.automationWorkflows || 0,
        automationActionsPerWorkflow:
          tier.tierLimits?.automationActionsPerWorkflow || 3,

        // AI & Advanced Features
        chatbotEnabled: tier.tierLimits?.chatbotEnabled || false,
        leadScoringEnabled: tier.tierLimits?.leadScoringEnabled || false,
        sentimentAnalysisEnabled:
          tier.tierLimits?.sentimentAnalysisEnabled || false,
        aiSummariesEnabled: tier.tierLimits?.aiSummariesEnabled || false,

        // Invoicing & Payments
        invoicesPerMonth: tier.tierLimits?.invoicesPerMonth || 10,
        customInvoiceBranding: tier.tierLimits?.customInvoiceBranding || false,

        // Integrations
        zapierIntegration: tier.tierLimits?.zapierIntegration || false,
        webhookIntegration: tier.tierLimits?.webhookIntegration || false,
        apiAccess: tier.tierLimits?.apiAccess || false,
        maxWebhooks: tier.tierLimits?.maxWebhooks || 0,

        // Marketplace & Distribution
        marketplaceAccess: tier.tierLimits?.marketplaceAccess || false,
        exclusiveLeads: tier.tierLimits?.exclusiveLeads || false,
        leadDistributionRules: tier.tierLimits?.leadDistributionRules || false,

        // Data & Reporting
        exports: tier.tierLimits?.exports || false,
        imports: tier.tierLimits?.imports || false,
        advancedReports: tier.tierLimits?.advancedReports || false,
        dataRetentionDays: tier.tierLimits?.dataRetentionDays || 90,

        // Team & Access
        teamMembers: tier.tierLimits?.teamMembers || 1,
        maxConcurrentSessions: tier.tierLimits?.maxConcurrentSessions || 1,

        // Support
        liveSupport: tier.tierLimits?.liveSupport || false,
        prioritySupport: tier.tierLimits?.prioritySupport || false,

        // Customization
        customBranding: tier.tierLimits?.customBranding || false,
        customDomain: tier.tierLimits?.customDomain || false,
      },
      // Reset usage for new billing period
      "subscription.subscriptionUsage": {
        leads: 0,
        callSeconds: 0,
        forms: 0,
        buyers: 0,
        emailCampaigns: 0,
        smsCampaigns: 0,
        workflowExecutions: 0,
        invoices: 0,
        activeSessions: 0,
        teamMembersCount: 0,
        usagePeriodStart: startDate,
        usagePeriodEnd: expiryDate,
      },
    };

    // Update user's subscription
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { $set: subscriptionUpdate },
      { new: true },
    ).select("subscription");

    if (!updatedUser) {
      return notFound("User not found after update");
    }

    // Invalidate session cache so the new subscription is fetched on next request
    await invalidateSessionCache(session.user.email);
    // Also invalidate all sessions for this user ID
    await invalidateAllUserSessions(session.user.id);

    return successResponse({
      success: true,
      subscription: updatedUser.subscription,
    });
  } catch (error) {
    console.error("[POST /api/subscriptions/update]", error);
    return internalError("Failed to update subscription");
  }
}
