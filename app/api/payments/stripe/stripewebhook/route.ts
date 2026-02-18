import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import { User } from "@/models";
import { Transaction } from "@/models/transactions";
import { Tier } from "@/models/tier";
import {
  forceRefreshUserSession,
  invalidateSessionWithConfirmation,
} from "@/lib/cachedSession";
import {
  activateSubscription,
  deactivateSubscription,
  handleInvoicePaid,
  handlePaymentFailed,
} from "@/lib/stripeSubscriptionService";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

type PurchaseType = "credits" | "subscription";

interface Metadata {
  purchaseType: PurchaseType;
  userId: string;
  units?: string;
  tierId?: string;
  durationMonths?: string;
  sellerId?: string;
  billingInterval?: string;
}

type LegacyInvoiceSubscription = {
  subscription?: string | Stripe.Subscription | null;
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error: any) {
    console.error("Webhook signature verification failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Webhook signature verification failed",
        error: error?.message || "Unknown error",
      },
      { status: 400 },
    );
  }

  try {
    await dbConnect();

    console.log("[StripeWebhook] Processing event:", event.type);

    switch (event.type as string) {
      case "account.updated":
        const account = event.data.object;
        if (
          account &&
          typeof account === "object" &&
          "charges_enabled" in account &&
          "details_submitted" in account &&
          "payouts_enabled" in account
        ) {
          await handleAccountUpdated(account as Stripe.Account);
        }
        break;

      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;
        return await handleCheckoutSessionCompleted(session);

      // Subscription lifecycle events
      case "customer.subscription.created":
      case "customer.subscription.updated":
        const updatedSubscription = event.data.object as Stripe.Subscription;
        return await handleSubscriptionUpdated(updatedSubscription);

      case "customer.subscription.deleted":
        const deletedSubscription = event.data.object as Stripe.Subscription;
        return await handleSubscriptionDeleted(deletedSubscription);

      // Invoice events for renewal
      case "invoice.paid":
        const paidInvoice = event.data.object as Stripe.Invoice;
        return await handleInvoicePaidEvent(paidInvoice);

      case "invoice.payment_failed":
        const failedInvoice = event.data.object as Stripe.Invoice;
        return await handleInvoicePaymentFailed(failedInvoice);

      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        if (
          paymentIntent &&
          typeof paymentIntent === "object" &&
          "object" in paymentIntent &&
          paymentIntent.object === "payment_intent"
        ) {
          await verifyPaymentIntent(paymentIntent as Stripe.PaymentIntent);
        }
        break;

      case "transfer.created":
      case "transfer.paid":
        const transfer = event.data.object;
        if (
          transfer &&
          typeof transfer === "object" &&
          "object" in transfer &&
          transfer.object === "transfer" &&
          "destination" in transfer &&
          "status" in transfer &&
          "id" in transfer &&
          "created" in transfer
        ) {
          await handleTransferEvent(transfer as Stripe.Transfer, event.type);
        }
        break;

      default:
        console.log("[StripeWebhook] Unhandled event type:", event.type);
        return NextResponse.json({ received: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  if (account.tos_acceptance?.date) {
    await User.findOneAndUpdate(
      { stripeAccountId: account.id },
      {
        "tosAcceptance.accepted": true,
        "tosAcceptance.acceptedAt": new Date(
          account.tos_acceptance.date * 1000,
        ),
        "tosAcceptance.ipAddress": account.tos_acceptance.ip || "unknown",
      },
    );
  }

  await User.findOneAndUpdate(
    { stripeAccountId: account.id },
    {
      stripeOnboarded: account.details_submitted,
      $set: {
        "stripeDetails.chargesEnabled": account.charges_enabled,
        "stripeDetails.payoutsEnabled": account.payouts_enabled,
        "stripeDetails.requirements": account.requirements,
      },
    },
  );
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
) {
  const metadata = session.metadata
    ? (session.metadata as unknown as Metadata)
    : null;

  if (!metadata?.purchaseType || !metadata?.userId) {
    return NextResponse.json(
      { success: false, message: "Missing required metadata" },
      { status: 400 },
    );
  }

  if (metadata.purchaseType === "credits") {
    return await handleCreditsPurchase(session, metadata);
  } else if (metadata.purchaseType === "subscription") {
    return await handleSubscriptionPurchase(session, metadata);
  }

  return NextResponse.json(
    { success: false, message: "Unknown purchase type" },
    { status: 400 },
  );
}

async function verifyPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  // Only process if this is a direct charge (not a transfer)
  if (paymentIntent.transfer_data?.destination) {
    const sellerAccountId = paymentIntent.transfer_data.destination;
    const amount = paymentIntent.amount_received
      ? paymentIntent.amount_received / 100
      : 0;

    // Verify the payment landed in seller's account
    await Transaction.findOneAndUpdate(
      { gatewayTransactionId: paymentIntent.id },
      {
        $set: {
          "metadata.transferVerified": true,
          "metadata.transferAmount": amount,
        },
      },
    );
  }
}

async function handleTransferEvent(
  transfer: Stripe.Transfer,
  eventType: string,
) {
  // Verify transfers to seller accounts
  const transaction = await Transaction.findOneAndUpdate(
    {
      "metadata.sellerAccountId": transfer.destination,
      "metadata.transferVerified": { $ne: true },
    },
    {
      $set: {
        "metadata.transferId": transfer.id,
        "metadata.transferStatus": eventType, // e.g., "transfer.paid" or "transfer.created"
        "metadata.transferVerified": true,
        "metadata.transferDate": new Date(transfer.created * 1000),
      },
    },
    { new: true },
  );

  if (transaction) {
    // Transfer events are recorded for reconciliation only.
  }
}

async function handleCreditsPurchase(
  session: Stripe.Checkout.Session,
  metadata: Metadata,
) {
  const units = parseInt(metadata.units || "0");
  const amount = session.amount_total ? session.amount_total / 100 : 0;
  const userId = metadata.userId;
  const sellerId = metadata.sellerId;
  const email = session.customer_details?.email;

  if (!email) {
    return NextResponse.json(
      { success: false, message: "Customer email not found" },
      { status: 400 },
    );
  }

  if (!units || !amount || !userId || !sellerId) {
    return NextResponse.json(
      { success: false, message: "Missing required data for credits purchase" },
      { status: 400 },
    );
  }

  // Find the buyer and seller
  const [buyer, seller] = await Promise.all([
    Buyer.findOne({ email }),
    User.findById(sellerId),
  ]);

  if (!buyer) {
    return NextResponse.json(
      { success: false, message: "Buyer not found" },
      { status: 404 },
    );
  }

  if (!seller) {
    return NextResponse.json(
      { success: false, message: "Seller not found" },
      { status: 404 },
    );
  }

  // Update buyer's wallet
  await Buyer.findByIdAndUpdate(
    buyer._id,
    { $inc: { walletUnit: units } },
    { new: true },
  );

  // Create transaction record (initially unverified)
  const transaction = new Transaction({
    type: "units_purchase",
    userId: buyer._id,
    amount,
    currency: session.currency || "usd",
    previousBalance: buyer.walletUnit,
    currentBalance: buyer.walletUnit + units,
    paymentGateway: "stripe",
    gatewayTransactionId: session.payment_intent?.toString() || session.id,
    status: "completed",
    metadata: {
      sellerId,
      sellerAccountId: seller.stripeAccountId,
      unitsPurchased: units,
      checkoutSessionId: session.id,
      transferVerified: false,
    },
  });
  await transaction.save();
  // Update lead seller's balance if applicable
  if (buyer.registeredWith) {
    const leadSeller = await User.findByIdAndUpdate(
      buyer.registeredWith,
      { $inc: { walletBalance: amount } },
      { new: true },
    );

    if (leadSeller) {
      const sellerTransaction = new Transaction({
        type: "seller_income",
        userId: buyer.registeredWith,
        amount,
        currency: session.currency || "usd",
        previousBalance: leadSeller.walletBalance - amount,
        currentBalance: leadSeller.walletBalance,
        paymentGateway: "stripe",
        gatewayTransactionId: session.id,
        status: "completed",
        metadata: {
          buyerId: buyer._id,
          unitsPurchased: units,
        },
      });
      await sellerTransaction.save();
    }
  }

  return NextResponse.json({
    success: true,
    message: "Credits purchase Successfully processed",
  });
}

async function handleSubscriptionPurchase(
  session: Stripe.Checkout.Session,
  metadata: Metadata,
) {
  const { tierId, userId, durationMonths, billingInterval } = metadata;
  const amount = session.amount_total ? session.amount_total / 100 : 0;

  if (!tierId || !userId) {
    return NextResponse.json(
      { success: false, message: "Missing required data for subscription" },
      { status: 400 },
    );
  }

  const [tier, user] = await Promise.all([
    Tier.findById(tierId),
    User.findById(userId),
  ]);

  if (!tier) {
    return NextResponse.json(
      { success: false, message: "Tier not found" },
      { status: 404 },
    );
  }

  if (!user) {
    return NextResponse.json(
      { success: false, message: "User not found" },
      { status: 404 },
    );
  }

  // Calculate subscription duration: use durationMonths if available, otherwise calculate from billingInterval
  let subscriptionDurationMonths = 1;
  if (durationMonths) {
    subscriptionDurationMonths = parseInt(durationMonths, 10);
  } else if (billingInterval === "year") {
    subscriptionDurationMonths = 12;
  } else if (billingInterval === "month") {
    subscriptionDurationMonths = 1;
  }

  // Calculate subscription dates
  const startDate = new Date();
  const expiryDate = new Date(startDate);
  expiryDate.setMonth(expiryDate.getMonth() + subscriptionDurationMonths);

  // Update user's subscription
  await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        "subscription.subscriptionPlan": tier.name,
        "subscription.subscriptionStartDate": startDate,
        "subscription.subscriptionExpiryDate": expiryDate,
        "subscription.isSubscriptionActive": true,
        "subscription.isTrial": false,
        "subscription.subscriptionPaymentMethod": "stripe",
        "subscription.subscriptionTierId": tierId,
        "subscription.subscriptionTierType": tier.tierType,
        "subscription.subscriptionPrice":
          parseFloat(tier.discountedPrice || "0") * subscriptionDurationMonths,
        "subscription.subscriptionPaymentId": session.id,
        "subscription.subscriptionRenewalPrice":
          parseFloat(tier.renewalPrice || "0") * subscriptionDurationMonths,
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
          emailCampaignsEnabled:
            tier.tierLimits?.emailCampaignsEnabled || false,
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
          customInvoiceBranding:
            tier.tierLimits?.customInvoiceBranding || false,

          // Integrations
          zapierIntegration: tier.tierLimits?.zapierIntegration || false,
          webhookIntegration: tier.tierLimits?.webhookIntegration || false,
          apiAccess: tier.tierLimits?.apiAccess || false,
          maxWebhooks: tier.tierLimits?.maxWebhooks || 0,

          // Marketplace & Distribution
          marketplaceAccess: tier.tierLimits?.marketplaceAccess || false,
          exclusiveLeads: tier.tierLimits?.exclusiveLeads || false,
          leadDistributionRules:
            tier.tierLimits?.leadDistributionRules || false,

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
      },
    },
    { new: true },
  );

  // Force refresh session cache to prevent race conditions
  // This ensures user immediately sees their new subscription status
  const refreshResult = await forceRefreshUserSession(userId, {
    maxRetries: 3,
  });
  if (!refreshResult.success) {
    console.error(
      "[StripeWebhook] Session refresh failed (will be consistent eventually):",
      refreshResult.error,
    );
    // Fallback: confirm invalidation at minimum
    if (user?.email) {
      await invalidateSessionWithConfirmation(user.email, userId);
    }
  } else {
    console.log("[StripeWebhook] Session refreshed successfully for:", userId);
  }

  // Create transaction record
  const transaction = new Transaction({
    type: "subscription_payment",
    userId,
    amount,
    currency: session.currency || "usd",
    paymentGateway: "stripe",
    gatewayTransactionId: session.payment_intent?.toString() || session.id,
    status: "completed", // Platform payments are trusted immediately
    metadata: {
      tierId,
      tierType: tier.tierType,
      durationMonths: parseInt(durationMonths || "1"),
      subscriptionPlan: tier.name,
      isPlatformPayment: true,
    },
  });
  await transaction.save();

  return NextResponse.json({
    success: true,
    message: "Subscription created successfully",
  });
}

/**
 * Handle subscription updates from Stripe subscription lifecycle events
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(
    "[StripeWebhook] Subscription updated:",
    subscription.id,
    subscription.status,
  );

  const tierId = subscription.metadata?.tierId;
  const userId = subscription.metadata?.userId;

  // First, try to find user by subscription ID (works for plan changes)
  let user = await User.findOne({
    "subscription.stripeSubscriptionId": subscription.id,
  });

  // Fallback to userId from metadata (for new subscriptions)
  if (!user && userId) {
    user = await User.findById(userId);
  }

  if (!user) {
    console.log(
      "[StripeWebhook] User not found for subscription:",
      subscription.id,
    );
    return NextResponse.json({ received: true });
  }

  // Check if this is a plan change (tierId in metadata differs from current)
  const isPlanChange =
    tierId &&
    user.subscription?.subscriptionTierId &&
    tierId !== user.subscription.subscriptionTierId.toString();

  console.log("[StripeWebhook] Subscription update detected:", {
    userId: user._id,
    isPlanChange,
    currentTierId: user.subscription?.subscriptionTierId,
    newTierId: tierId,
    subscriptionStatus: subscription.status,
  });

  // Handle plan changes - finalize immediately if subscription is active
  if (
    isPlanChange &&
    (subscription.status === "active" || subscription.status === "trialing")
  ) {
    console.log(
      "[StripeWebhook] PLAN CHANGE DETECTED - Finalizing upgrade/downgrade",
    );

    try {
      const tier = await Tier.findById(tierId);
      if (!tier) {
        console.error("[StripeWebhook] New tier not found:", tierId);
        return NextResponse.json({ received: true });
      }

      const billingInterval = subscription.metadata?.billingInterval || "month";
      const durationMonths = billingInterval === "year" ? 12 : 1;
      const renewalPrice =
        parseFloat(tier.renewalPrice || "0") * durationMonths;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = subscription as any;
      const newExpiryDate = sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Get actual price from Stripe subscription
      const stripePrice = subscription.items.data[0]?.price;
      const actualPriceInCents = stripePrice?.unit_amount || 0;
      const actualPrice = actualPriceInCents / 100;

      // Check for applied discount
      const discounts = subscription.discounts;
      type ExpandedDiscount = {
        coupon?: { id?: string; percent_off?: number };
      };
      const firstDiscount: ExpandedDiscount | null =
        Array.isArray(discounts) && discounts.length > 0
          ? (discounts[0] as unknown as ExpandedDiscount)
          : null;
      const appliedCoupon = firstDiscount?.coupon?.id || null;
      const discountPercent = firstDiscount?.coupon?.percent_off || 0;
      const effectivePrice =
        discountPercent > 0
          ? actualPrice * (1 - discountPercent / 100)
          : actualPrice;

      // Update user with new plan details and ALL limits/features
      await User.findByIdAndUpdate(user._id, {
        $set: {
          "subscription.subscriptionTierId": tierId,
          "subscription.subscriptionPlan": tier.name,
          "subscription.subscriptionTierType": tier.tierType,
          "subscription.billingInterval": billingInterval,
          "subscription.subscriptionRenewalPrice": renewalPrice,
          "subscription.subscriptionExpiryDate": newExpiryDate,
          "subscription.isSubscriptionActive": true,
          "subscription.subscriptionPrice": effectivePrice,
          "subscription.subscriptionBasePrice": actualPrice,
          "subscription.appliedCoupon": appliedCoupon,
          "subscription.discountPercent": discountPercent,
          // Update ALL subscription limits with new tier limits
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
            emailCampaignsEnabled:
              tier.tierLimits?.emailCampaignsEnabled || false,
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
            customInvoiceBranding:
              tier.tierLimits?.customInvoiceBranding || false,

            // Integrations
            zapierIntegration: tier.tierLimits?.zapierIntegration || false,
            webhookIntegration: tier.tierLimits?.webhookIntegration || false,
            apiAccess: tier.tierLimits?.apiAccess || false,
            maxWebhooks: tier.tierLimits?.maxWebhooks || 0,

            // Marketplace & Distribution
            marketplaceAccess: tier.tierLimits?.marketplaceAccess || false,
            exclusiveLeads: tier.tierLimits?.exclusiveLeads || false,
            leadDistributionRules:
              tier.tierLimits?.leadDistributionRules || false,

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
        },
      });

      console.log(
        `[StripeWebhook] Plan change finalized: ${user.email} → ${tier.name} (limits updated)`,
      );

      // Force refresh user session
      await forceRefreshUserSession(String(user._id), { maxRetries: 3 });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("[StripeWebhook] Failed to finalize plan change:", error);
      return NextResponse.json(
        { success: false, message: "Failed to finalize plan change" },
        { status: 500 },
      );
    }
  }

  // Handle new subscriptions or reactivations
  if (!tierId || !userId) {
    console.log(
      "[StripeWebhook] Missing tierId or userId in subscription metadata",
    );
    return NextResponse.json({ received: true });
  }

  // Only activate for active/trialing subscriptions
  if (subscription.status === "active" || subscription.status === "trialing") {
    const result = await activateSubscription(subscription, tierId, userId);

    if (!result.success) {
      console.error(
        "[StripeWebhook] Failed to activate subscription:",
        result.message,
      );
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 500 },
      );
    }

    // Create transaction record for new/renewed subscription
    const amount = subscription.items.data[0]?.price?.unit_amount
      ? subscription.items.data[0].price.unit_amount / 100
      : 0;

    const transaction = new Transaction({
      type: "subscription_payment",
      userId,
      amount,
      currency: subscription.currency || "usd",
      paymentGateway: "stripe",
      gatewayTransactionId: subscription.id,
      status: "completed",
      metadata: {
        tierId,
        stripeSubscriptionId: subscription.id,
        billingInterval: subscription.items.data[0]?.price?.recurring?.interval,
        isPlatformPayment: true,
        isRecurring: true,
      },
    });
    await transaction.save();
  } else if (subscription.status === "past_due") {
    // Mark subscription as having payment issues
    await User.findByIdAndUpdate(userId, {
      "subscription.paymentFailed": true,
      "subscription.lastPaymentFailedAt": new Date(),
    });
  }

  return NextResponse.json({ success: true });
}

/**
 * Handle subscription deletion (cancellation)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("[StripeWebhook] Subscription deleted:", subscription.id);

  const result = await deactivateSubscription(subscription.id);

  if (!result.success) {
    console.error(
      "[StripeWebhook] Failed to deactivate subscription:",
      result.message,
    );
  }

  return NextResponse.json({ success: true });
}

/**
 * Handle invoice.paid event - subscription renewal
 */
async function handleInvoicePaidEvent(invoice: Stripe.Invoice) {
  console.log("[StripeWebhook] Invoice paid:", invoice.id);

  // Only handle subscription invoices
  const legacyInvoice = invoice as unknown as LegacyInvoiceSubscription;
  const subscriptionRef =
    invoice.parent?.subscription_details?.subscription ??
    legacyInvoice.subscription ??
    null;
  if (!subscriptionRef) {
    return NextResponse.json({ received: true });
  }

  const result = await handleInvoicePaid(invoice);

  if (result.success) {
    // Create transaction record for renewal
    let stripeSubscriptionId: string;
    if (typeof subscriptionRef === "string") {
      stripeSubscriptionId = subscriptionRef;
    } else {
      stripeSubscriptionId = subscriptionRef.id;
    }

    const user = await User.findOne({
      "subscription.stripeSubscriptionId": stripeSubscriptionId,
    });

    if (user) {
      const transaction = new Transaction({
        type: "subscription_renewal",
        userId: user._id,
        amount: invoice.amount_paid ? invoice.amount_paid / 100 : 0,
        currency: invoice.currency || "usd",
        paymentGateway: "stripe",
        gatewayTransactionId: invoice.id,
        status: "completed",
        metadata: {
          stripeSubscriptionId,
          invoiceNumber: invoice.number,
          isPlatformPayment: true,
          isRenewal: true,
        },
      });
      await transaction.save();
    }
  }

  return NextResponse.json({ success: true });
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log("[StripeWebhook] Invoice payment failed:", invoice.id);

  const result = await handlePaymentFailed(invoice);

  // TODO: Send notification email to user about failed payment

  return NextResponse.json({ success: true });
}
