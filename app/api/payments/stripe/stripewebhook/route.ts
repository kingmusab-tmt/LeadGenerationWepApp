import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import { User } from "@/models";
import { Transaction } from "@/models/transactions";
import { Tier } from "@/models/tier";
import { StripeEvent } from "@/models/stripeEvent";
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
import { env } from "@/lib/env";

/**
 * Check if a Stripe event has already been processed.
 * Returns true if event was already handled (skip processing).
 */
async function isEventAlreadyProcessed(eventId: string): Promise<boolean> {
  const existing = await StripeEvent.findOne({ eventId }).lean();
  return !!existing;
}

/**
 * Atomically claim a Stripe event for processing.
 * Returns true if successfully claimed, false if already claimed by another process.
 * This prevents race conditions where two webhooks arrive simultaneously.
 */
async function claimEventForProcessing(
  eventId: string,
  eventType: string,
): Promise<boolean> {
  try {
    const result = await StripeEvent.updateOne(
      { eventId },
      {
        $setOnInsert: {
          eventId,
          eventType,
          processedAt: new Date(),
          metadata: { status: "processing" },
        },
      },
      { upsert: true },
    );
    // If upsertedCount is 1, we successfully claimed it (new document created)
    // If upsertedCount is 0, it already existed (another process claimed it)
    return result.upsertedCount === 1;
  } catch (error: unknown) {
    // Duplicate key error means another process claimed it first
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return false;
    }
    throw error;
  }
}

/**
 * Mark a Stripe event as processed with metadata.
 * Uses upsert to handle race conditions gracefully.
 */
async function markEventProcessed(
  eventId: string,
  eventType: string,
  metadata?: {
    sessionId?: string;
    paymentIntentId?: string;
    userId?: string;
    buyerId?: string;
    sellerId?: string;
    units?: number;
    amount?: number;
    creditsApplied?: boolean;
    error?: string;
  },
): Promise<void> {
  await StripeEvent.updateOne(
    { eventId },
    {
      $set: {
        eventType,
        sessionId: metadata?.sessionId,
        paymentIntentId: metadata?.paymentIntentId,
        metadata: {
          status: "completed",
          userId: metadata?.userId,
          buyerId: metadata?.buyerId,
          sellerId: metadata?.sellerId,
          units: metadata?.units,
          amount: metadata?.amount,
          creditsApplied: metadata?.creditsApplied,
          error: metadata?.error,
        },
      },
    },
  );
}

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
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

type StripeAccountWithId = {
  id?: string;
};

type StripeInvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
};

type StripeTransferWithStatus = Stripe.Transfer & {
  status?: string;
};

type StripeSubscriptionWithPeriodEnd = Stripe.Subscription & {
  current_period_end?: number;
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      {
        success: false,
        message: "Missing stripe-signature header",
      },
      { status: 400 },
    );
  }

  console.log("[StripeWebhook] ===== WEBHOOK RECEIVED =====");
  console.log("[StripeWebhook] Signature present:", !!signature);
  console.log("[StripeWebhook] Body length:", body.length);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
    console.log("[StripeWebhook] ✓ Signature verified successfully");
  } catch (error: unknown) {
    console.error(
      "[StripeWebhook] ✗ Webhook signature verification failed:",
      error,
    );
    console.error("[StripeWebhook] Error details:", {
      message: error instanceof Error ? error.message : undefined,
      type: error instanceof Stripe.errors.StripeError ? error.type : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        message: "Webhook signature verification failed",
      },
      { status: 400 },
    );
  }

  try {
    await dbConnect();
    console.log("[StripeWebhook] ✓ Database connected");

    console.log("[StripeWebhook] Processing event:", event.type);
    console.log("[StripeWebhook] Event ID:", event.id);
    console.log(
      "[StripeWebhook] Created:",
      new Date(event.created * 1000).toISOString(),
    );
    console.log("[StripeWebhook] Livemode:", event.livemode);

    // ═══════════════════════════════════════════════════════════════════════
    // IDEMPOTENCY CHECK: Atomically claim event BEFORE processing
    // This prevents race conditions where two webhooks arrive simultaneously
    // Only one process can successfully claim (insert) the event document
    // ═══════════════════════════════════════════════════════════════════════
    const alreadyProcessed = await isEventAlreadyProcessed(event.id);
    if (alreadyProcessed) {
      console.log(
        `[StripeWebhook] ↺ Event ${event.id} already processed, returning 200 to acknowledge`,
      );
      return NextResponse.json({
        success: true,
        message: "Event already processed",
        eventId: event.id,
      });
    }

    // For credit-related events, atomically claim before processing
    const creditRelatedEvents = [
      "checkout.session.completed",
      "charge.succeeded",
      "payment_intent.succeeded",
    ];

    if (creditRelatedEvents.includes(event.type)) {
      const claimed = await claimEventForProcessing(event.id, event.type);
      if (!claimed) {
        console.log(
          `[StripeWebhook] ↺ Event ${event.id} already claimed by another process, returning 200`,
        );
        return NextResponse.json({
          success: true,
          message: "Event already being processed",
          eventId: event.id,
        });
      }
      console.log(`[StripeWebhook] ✓ Event ${event.id} claimed for processing`);
    }

    switch (event.type as string) {
      case "account.updated":
        console.log("[StripeWebhook] → Handling account.updated");
        const account = event.data.object;
        console.log(
          "[StripeWebhook] Account ID:",
          (account as StripeAccountWithId)?.id,
        );
        if (
          account &&
          typeof account === "object" &&
          "charges_enabled" in account &&
          "details_submitted" in account &&
          "payouts_enabled" in account
        ) {
          await handleAccountUpdated(account as Stripe.Account);
        }
        console.log("[StripeWebhook] ✓ account.updated processed");
        break;

      case "checkout.session.completed":
        console.log("[StripeWebhook] → Handling checkout.session.completed");
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("[StripeWebhook] Session ID:", session.id);
        console.log("[StripeWebhook] Amount total:", session.amount_total);
        return await handleCheckoutSessionCompleted(session, event.id);

      // Subscription lifecycle events
      case "customer.subscription.created":
      case "customer.subscription.updated":
        console.log(`[StripeWebhook] → Handling ${event.type}`);
        const updatedSubscription = event.data.object as Stripe.Subscription;
        console.log("[StripeWebhook] Subscription ID:", updatedSubscription.id);
        console.log("[StripeWebhook] Status:", updatedSubscription.status);
        return await handleSubscriptionUpdated(updatedSubscription);

      case "customer.subscription.deleted":
        console.log("[StripeWebhook] → Handling customer.subscription.deleted");
        const deletedSubscription = event.data.object as Stripe.Subscription;
        console.log("[StripeWebhook] Subscription ID:", deletedSubscription.id);
        return await handleSubscriptionDeleted(deletedSubscription);

      // Invoice events for renewal
      case "invoice.paid":
        console.log("[StripeWebhook] → Handling invoice.paid");
        const paidInvoice = event.data.object as Stripe.Invoice;
        console.log("[StripeWebhook] Invoice ID:", paidInvoice.id);
        console.log(
          "[StripeWebhook] Amount paid:",
          paidInvoice.amount_paid / 100,
        );
        console.log(
          "[StripeWebhook] Subscription:",
          (paidInvoice as StripeInvoiceWithSubscription).subscription,
        );
        return await handleInvoicePaidEvent(paidInvoice);

      case "invoice.payment_failed":
        console.log("[StripeWebhook] → Handling invoice.payment_failed");
        const failedInvoice = event.data.object as Stripe.Invoice;
        console.log("[StripeWebhook] Invoice ID:", failedInvoice.id);
        console.log(
          "[StripeWebhook] Subscription:",
          (failedInvoice as StripeInvoiceWithSubscription).subscription,
        );
        return await handleInvoicePaymentFailed(failedInvoice);

      case "invoice.upcoming":
        console.log("[StripeWebhook] → Handling invoice.upcoming");
        const upcomingInvoice = event.data.object as Stripe.Invoice;
        console.log("[StripeWebhook] Invoice ID:", upcomingInvoice.id);
        console.log(
          "[StripeWebhook] Amount due:",
          upcomingInvoice.amount_due / 100,
        );
        console.log(
          "[StripeWebhook] Subscription:",
          (upcomingInvoice as StripeInvoiceWithSubscription).subscription,
        );
        return await handleInvoiceUpcoming(upcomingInvoice);

      // Payment Intent events
      case "payment_intent.created":
        console.log("[StripeWebhook] → Handling payment_intent.created");
        const createdPaymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(
          "[StripeWebhook] Payment Intent ID:",
          createdPaymentIntent.id,
        );
        console.log(
          "[StripeWebhook] Amount:",
          createdPaymentIntent.amount / 100,
        );
        await handlePaymentIntentCreated(createdPaymentIntent);
        console.log("[StripeWebhook] ✓ payment_intent.created processed");
        break;

      case "payment_intent.succeeded":
        console.log("[StripeWebhook] → Handling payment_intent.succeeded");
        const paymentIntent = event.data.object;
        if (
          paymentIntent &&
          typeof paymentIntent === "object" &&
          "object" in paymentIntent &&
          paymentIntent.object === "payment_intent"
        ) {
          const pi = paymentIntent as Stripe.PaymentIntent;
          console.log("[StripeWebhook] Payment Intent ID:", pi.id);
          console.log(
            "[StripeWebhook] Amount received:",
            pi.amount_received / 100,
          );
          console.log("[StripeWebhook] Has transfer:", !!pi.transfer_data);
          await verifyPaymentIntent(pi);
        }
        console.log("[StripeWebhook] ✓ payment_intent.succeeded processed");
        break;

      case "payment_intent.payment_failed":
        console.log("[StripeWebhook] → Handling payment_intent.payment_failed");
        const failedPaymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(
          "[StripeWebhook] Payment Intent ID:",
          failedPaymentIntent.id,
        );
        console.log(
          "[StripeWebhook] Error:",
          failedPaymentIntent.last_payment_error?.message,
        );
        await handlePaymentIntentFailed(failedPaymentIntent);
        console.log(
          "[StripeWebhook] ✓ payment_intent.payment_failed processed",
        );
        break;

      // Charge events
      case "charge.succeeded":
        console.log("[StripeWebhook] → Handling charge.succeeded");
        const succeededCharge = event.data.object as Stripe.Charge;
        console.log("[StripeWebhook] Charge ID:", succeededCharge.id);
        console.log("[StripeWebhook] Amount:", succeededCharge.amount / 100);
        await handleChargeSucceeded(succeededCharge);
        console.log("[StripeWebhook] ✓ charge.succeeded processed");
        break;

      case "charge.failed":
        console.log("[StripeWebhook] → Handling charge.failed");
        const failedCharge = event.data.object as Stripe.Charge;
        console.log("[StripeWebhook] Charge ID:", failedCharge.id);
        console.log(
          "[StripeWebhook] Failure message:",
          failedCharge.failure_message,
        );
        await handleChargeFailed(failedCharge);
        console.log("[StripeWebhook] ✓ charge.failed processed");
        break;

      case "charge.refunded":
        console.log("[StripeWebhook] → Handling charge.refunded");
        const refundedCharge = event.data.object as Stripe.Charge;
        console.log("[StripeWebhook] Charge ID:", refundedCharge.id);
        console.log(
          "[StripeWebhook] Refund amount:",
          refundedCharge.amount_refunded / 100,
        );
        await handleChargeRefunded(refundedCharge);
        console.log("[StripeWebhook] ✓ charge.refunded processed");
        break;

      case "transfer.created":
      case "transfer.updated":
      case "transfer.reversed":
        console.log(`[StripeWebhook] → Handling ${event.type}`);
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
          const t = transfer as Stripe.Transfer;
          console.log("[StripeWebhook] Transfer ID:", t.id);
          console.log("[StripeWebhook] Destination:", t.destination);
          console.log("[StripeWebhook] Amount:", t.amount / 100);
          await handleTransferEvent(t, event.type);
        }
        console.log(`[StripeWebhook] ✓ ${event.type} processed`);
        break;

      default:
        console.log("[StripeWebhook] ⚠ Unhandled event type:", event.type);
        return NextResponse.json({ received: true });
    }

    console.log("[StripeWebhook] ===== WEBHOOK COMPLETED SUCCESSFULLY =====");
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[StripeWebhook] ✗✗✗ WEBHOOK ERROR ✗✗✗");
    console.error(
      "[StripeWebhook] Error type:",
      error instanceof Error ? error.name : "Unknown",
    );
    console.error(
      "[StripeWebhook] Error message:",
      error instanceof Error ? error.message : "Unknown error",
    );
    console.error("[StripeWebhook] Event type:", event?.type);
    console.error("[StripeWebhook] Event ID:", event?.id);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  console.log("[handleAccountUpdated] Processing account:", account.id);
  console.log(
    "[handleAccountUpdated] Charges enabled:",
    account.charges_enabled,
  );
  console.log(
    "[handleAccountUpdated] Payouts enabled:",
    account.payouts_enabled,
  );
  console.log(
    "[handleAccountUpdated] Details submitted:",
    account.details_submitted,
  );

  if (account.tos_acceptance?.date) {
    console.log("[handleAccountUpdated] Updating TOS acceptance");
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

  const result = await User.findOneAndUpdate(
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

  console.log(
    "[handleAccountUpdated] ✓ Account updated:",
    result?.email || account.id,
  );
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  eventId: string,
) {
  console.log("[handleCheckoutSessionCompleted] Session ID:", session.id);
  console.log("[handleCheckoutSessionCompleted] Event ID:", eventId);
  console.log(
    "[handleCheckoutSessionCompleted] Payment status:",
    session.payment_status,
  );

  const metadata = session.metadata
    ? (session.metadata as unknown as Metadata)
    : null;

  if (!metadata?.purchaseType || !metadata?.userId) {
    console.error(
      "[handleCheckoutSessionCompleted] ✗ Missing required metadata",
    );
    // Mark event as processed even on error to prevent retries
    await markEventProcessed(eventId, "checkout.session.completed", {
      sessionId: session.id,
      error: "Missing required metadata",
    });
    return NextResponse.json(
      { success: false, message: "Missing required metadata" },
      { status: 400 },
    );
  }

  console.log(
    "[handleCheckoutSessionCompleted] Purchase type:",
    metadata.purchaseType,
  );
  console.log("[handleCheckoutSessionCompleted] User ID:", metadata.userId);

  if (metadata.purchaseType === "credits") {
    console.log(
      "[handleCheckoutSessionCompleted] → Processing credits purchase",
    );
    return await handleCreditsPurchase(session, metadata, eventId);
  } else if (metadata.purchaseType === "subscription") {
    console.log(
      "[handleCheckoutSessionCompleted] → Processing subscription purchase",
    );
    return await handleSubscriptionPurchase(session, metadata);
  }

  console.error(
    "[handleCheckoutSessionCompleted] ✗ Unknown purchase type:",
    metadata.purchaseType,
  );
  await markEventProcessed(eventId, "checkout.session.completed", {
    sessionId: session.id,
    error: `Unknown purchase type: ${metadata.purchaseType}`,
  });
  return NextResponse.json(
    { success: false, message: "Unknown purchase type" },
    { status: 400 },
  );
}

async function verifyPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  console.log("[verifyPaymentIntent] Payment Intent ID:", paymentIntent.id);
  console.log(
    "[verifyPaymentIntent] Amount received:",
    paymentIntent.amount_received / 100,
  );

  // Only process if this is a direct charge (not a transfer)
  if (paymentIntent.transfer_data?.destination) {
    const sellerAccountId = paymentIntent.transfer_data.destination;
    const amount = paymentIntent.amount_received
      ? paymentIntent.amount_received / 100
      : 0;

    console.log(
      "[verifyPaymentIntent] Transfer detected to seller:",
      sellerAccountId,
    );
    console.log("[verifyPaymentIntent] Transfer amount:", amount);

    // Verify the payment landed in seller's account
    const result = await Transaction.findOneAndUpdate(
      { gatewayTransactionId: paymentIntent.id },
      {
        $set: {
          "metadata.transferVerified": true,
          "metadata.transferAmount": amount,
        },
      },
    );

    console.log(
      "[verifyPaymentIntent] ✓ Transaction updated:",
      result?._id || "not found",
    );
  } else {
    console.log("[verifyPaymentIntent] No transfer data - platform payment");
  }
}

async function handleTransferEvent(
  transfer: Stripe.Transfer,
  eventType: string,
) {
  console.log("[handleTransferEvent] Event type:", eventType);
  console.log("[handleTransferEvent] Transfer ID:", transfer.id);
  console.log("[handleTransferEvent] Destination:", transfer.destination);
  console.log("[handleTransferEvent] Amount:", transfer.amount / 100);
  console.log(
    "[handleTransferEvent] Status:",
    (transfer as StripeTransferWithStatus).status,
  );

  // Verify transfers to seller accounts
  // transfer.created = funds initiated to seller
  // transfer.updated = transfer metadata/status updated
  // transfer.reversed = transfer was reversed (partial or full)

  const updateData: Record<string, unknown> = {
    "metadata.transferId": transfer.id,
    "metadata.transferStatus": eventType,
    "metadata.transferDate": new Date(transfer.created * 1000),
  };

  // Mark as verified on creation or update (if pending status is gone)
  if (eventType === "transfer.created" || eventType === "transfer.updated") {
    updateData["metadata.transferVerified"] = true;
    console.log("[handleTransferEvent] Marking transfer as verified");
  }

  // Mark as reversed if transfer was reversed
  if (eventType === "transfer.reversed") {
    updateData["metadata.transferReversed"] = true;
    updateData["metadata.transferReversedAt"] = new Date();
    console.log("[handleTransferEvent] ⚠ Transfer was REVERSED");
  }

  const transaction = await Transaction.findOneAndUpdate(
    {
      "metadata.sellerAccountId": transfer.destination,
    },
    { $set: updateData },
    { new: true },
  );

  if (transaction) {
    console.log(
      `[handleTransferEvent] ✓ Transfer ${eventType}: ${transfer.id} for transaction ${transaction._id}`,
    );
  } else {
    console.warn(
      `[handleTransferEvent] ⚠ No transaction found for seller account ${transfer.destination}`,
    );
  }
}

async function handleCreditsPurchase(
  session: Stripe.Checkout.Session,
  metadata: Metadata,
  eventId: string,
) {
  console.log("[handleCreditsPurchase] Processing credits purchase");
  console.log("[handleCreditsPurchase] Event ID:", eventId);
  const units = parseInt(metadata.units || "0");
  const amount = session.amount_total ? session.amount_total / 100 : 0;
  const gatewayTransactionId = session.payment_intent?.toString() || session.id;
  const userId = metadata.userId;
  const sellerId = metadata.sellerId;
  const email = session.customer_details?.email;

  console.log("[handleCreditsPurchase] Units:", units);
  console.log("[handleCreditsPurchase] Amount:", amount);
  console.log("[handleCreditsPurchase] User ID:", userId);
  console.log("[handleCreditsPurchase] Seller ID:", sellerId);
  console.log("[handleCreditsPurchase] Email:", email);

  // Helper to mark event and return error response
  const markEventAndReturnError = async (errorMsg: string, status: number) => {
    await markEventProcessed(eventId, "checkout.session.completed", {
      sessionId: session.id,
      userId: userId,
      sellerId: sellerId,
      error: errorMsg,
    });
    return NextResponse.json({ success: false, message: errorMsg }, { status });
  };

  if (!email) {
    console.error("[handleCreditsPurchase] ✗ Customer email not found");
    return markEventAndReturnError("Customer email not found", 400);
  }

  if (!units || !amount || !userId || !sellerId) {
    console.error("[handleCreditsPurchase] ✗ Missing required data");
    return markEventAndReturnError(
      "Missing required data for credits purchase",
      400,
    );
  }

  console.log("[handleCreditsPurchase] Looking up buyer and seller...");
  // Find the buyer and seller
  const [buyer, seller] = await Promise.all([
    Buyer.findOne({ email }),
    User.findById(sellerId),
  ]);

  if (!buyer) {
    console.error(
      "[handleCreditsPurchase] ✗ Buyer not found for email:",
      email,
    );
    return markEventAndReturnError("Buyer not found", 404);
  }

  if (!seller) {
    console.error("[handleCreditsPurchase] ✗ Seller not found:", sellerId);
    return markEventAndReturnError("Seller not found", 404);
  }

  console.log("[handleCreditsPurchase] ✓ Buyer found:", buyer.email);
  console.log("[handleCreditsPurchase] ✓ Seller found:", seller.email);
  console.log(
    "[handleCreditsPurchase] Current buyer wallet:",
    buyer.walletUnit,
  );

  // ═══════════════════════════════════════════════════════════════════════
  // CRITICAL: Atomic wallet update with session marker
  // This is the ONLY place where buyer credits are incremented
  // The processedCreditSessionIds check ensures exactly-once crediting
  // ═══════════════════════════════════════════════════════════════════════
  console.log(
    "[handleCreditsPurchase] Attempting atomic wallet update + processed marker",
  );
  const updatedBuyer = await Buyer.findOneAndUpdate(
    {
      _id: buyer._id,
      processedCreditSessionIds: { $ne: session.id },
    },
    {
      $inc: { walletUnit: units },
      $push: { processedCreditSessionIds: session.id },
    },
    { new: true },
  );

  let creditsApplied = false;
  let buyerWalletAfterCredit = updatedBuyer?.walletUnit;

  if (!updatedBuyer) {
    console.log(
      "[handleCreditsPurchase] ↺ Buyer session marker already present, skipping duplicate wallet credit but continuing idempotent writes",
      {
        sessionId: session.id,
        buyerId: buyer._id,
      },
    );

    const existingBuyer = await Buyer.findById(buyer._id).select("walletUnit");
    buyerWalletAfterCredit = existingBuyer?.walletUnit;
  } else {
    creditsApplied = true;
    console.log("[handleCreditsPurchase] ✓ Buyer wallet updated atomically", {
      previousBalance: updatedBuyer.walletUnit - units,
      currentBalance: updatedBuyer.walletUnit,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Mark event as processed IMMEDIATELY after credits are applied
  // This ensures that even if subsequent processing fails, Stripe won't
  // retry and the credits won't be double-applied
  // ═══════════════════════════════════════════════════════════════════════
  await markEventProcessed(eventId, "checkout.session.completed", {
    sessionId: session.id,
    userId: userId,
    buyerId: buyer._id.toString(),
    sellerId: sellerId,
    units: units,
    amount: amount,
    creditsApplied: creditsApplied,
  });
  console.log("[handleCreditsPurchase] ✓ Event marked as processed");

  // ═══════════════════════════════════════════════════════════════════════
  // If credits were NOT applied (duplicate session), return early
  // Do NOT create transactions or update seller - this was already done
  // ═══════════════════════════════════════════════════════════════════════
  if (!creditsApplied) {
    console.log(
      "[handleCreditsPurchase] ↺ Duplicate session detected - skipping transaction creation and seller update",
    );
    return NextResponse.json({
      success: true,
      message: "Credits already processed for this session",
      duplicate: true,
    });
  }

  const currentBalance = Number(buyerWalletAfterCredit || 0);
  const previousBalance = currentBalance - units;

  console.log("[handleCreditsPurchase] Upserting buyer units transaction...");
  await Transaction.updateOne(
    {
      type: "units_purchase",
      "metadata.checkoutSessionId": session.id,
    },
    {
      $setOnInsert: {
        type: "units_purchase",
        userId: buyer._id,
        amount,
        currency: session.currency || "usd",
        paymentGateway: "stripe",
        status: "completed",
        "metadata.sellerId": sellerId,
        "metadata.sellerName": seller.name || "Unknown",
        "metadata.sellerEmail": seller.email || "N/A",
        "metadata.sellerAccountId": seller.stripeAccountId,
        "metadata.buyerId": buyer._id,
        "metadata.buyerName": buyer.name || "Unknown",
        "metadata.buyerEmail": buyer.email || "N/A",
        "metadata.unitsPurchased": units,
        "metadata.checkoutSessionId": session.id,
        "metadata.transferVerified": false,
      },
      $set: {
        previousBalance,
        currentBalance,
        gatewayTransactionId,
        "metadata.creditsApplied": true,
      },
    },
    { upsert: true },
  );
  console.log("[handleCreditsPurchase] ✓ Buyer units transaction upserted");

  // Update lead seller's balance if applicable
  if (buyer.registeredWith) {
    console.log(
      "[handleCreditsPurchase] Updating seller balance for:",
      buyer.registeredWith,
    );

    // Fetch the registered seller's details for transaction record
    const registeredSeller = await User.findById(buyer.registeredWith);

    const sellerIncomeSeed = await Transaction.updateOne(
      {
        type: "seller_income",
        userId: buyer.registeredWith,
        "metadata.checkoutSessionId": session.id,
      },
      {
        $setOnInsert: {
          type: "seller_income",
          userId: buyer.registeredWith,
          amount,
          currency: session.currency || "usd",
          paymentGateway: "stripe",
          gatewayTransactionId: session.id,
          status: "completed",
          "metadata.buyerId": buyer._id,
          "metadata.buyerName": buyer.name || "Unknown",
          "metadata.buyerEmail": buyer.email || "N/A",
          "metadata.sellerId": buyer.registeredWith,
          "metadata.sellerName": registeredSeller?.name || "Unknown",
          "metadata.sellerEmail": registeredSeller?.email || "N/A",
          "metadata.unitsPurchased": units,
          "metadata.checkoutSessionId": session.id,
        },
      },
      { upsert: true },
    );

    if (sellerIncomeSeed.upsertedCount > 0) {
      const leadSeller = await User.findByIdAndUpdate(
        buyer.registeredWith,
        { $inc: { walletBalance: amount } },
        { new: true },
      );

      if (leadSeller) {
        console.log(
          "[handleCreditsPurchase] Seller balance updated:",
          leadSeller.walletBalance,
        );

        await Transaction.updateOne(
          {
            type: "seller_income",
            userId: buyer.registeredWith,
            "metadata.checkoutSessionId": session.id,
          },
          {
            $set: {
              previousBalance: leadSeller.walletBalance - amount,
              currentBalance: leadSeller.walletBalance,
              gatewayTransactionId: session.id,
            },
          },
        );

        console.log(
          "[handleCreditsPurchase] ✓ Seller transaction upserted and balances updated",
        );
      }
    } else {
      console.log(
        "[handleCreditsPurchase] ↺ Seller income already processed for checkout session",
        session.id,
      );
    }
  }

  console.log(
    "[handleCreditsPurchase] ✓✓✓ Credits purchase completed successfully",
  );
  return NextResponse.json({
    success: true,
    message: "Credits purchase Successfully processed",
  });
}

async function handleSubscriptionPurchase(
  session: Stripe.Checkout.Session,
  metadata: Metadata,
) {
  console.log("[handleSubscriptionPurchase] Processing subscription purchase");
  const { tierId, userId, durationMonths, billingInterval } = metadata;
  const amount = session.amount_total ? session.amount_total / 100 : 0;

  console.log("[handleSubscriptionPurchase] Tier ID:", tierId);
  console.log("[handleSubscriptionPurchase] User ID:", userId);
  console.log("[handleSubscriptionPurchase] Duration months:", durationMonths);
  console.log(
    "[handleSubscriptionPurchase] Billing interval:",
    billingInterval,
  );
  console.log("[handleSubscriptionPurchase] Amount:", amount);

  if (!tierId || !userId) {
    console.error("[handleSubscriptionPurchase] ✗ Missing required data");
    return NextResponse.json(
      { success: false, message: "Missing required data for subscription" },
      { status: 400 },
    );
  }

  console.log("[handleSubscriptionPurchase] Looking up tier and user...");
  const [tier, user] = await Promise.all([
    Tier.findById(tierId),
    User.findById(userId),
  ]);

  if (!tier) {
    console.error("[handleSubscriptionPurchase] ✗ Tier not found:", tierId);
    return NextResponse.json(
      { success: false, message: "Tier not found" },
      { status: 404 },
    );
  }

  if (!user) {
    console.error("[handleSubscriptionPurchase] ✗ User not found:", userId);
    return NextResponse.json(
      { success: false, message: "User not found" },
      { status: 404 },
    );
  }

  console.log("[handleSubscriptionPurchase] ✓ Tier found:", tier.name);
  console.log("[handleSubscriptionPurchase] ✓ User found:", user.email);

  // Calculate subscription duration: use durationMonths if available, otherwise calculate from billingInterval
  let subscriptionDurationMonths = 1;
  if (durationMonths) {
    subscriptionDurationMonths = parseInt(durationMonths, 10);
  } else if (billingInterval === "year") {
    subscriptionDurationMonths = 12;
  } else if (billingInterval === "month") {
    subscriptionDurationMonths = 1;
  }

  console.log(
    "[handleSubscriptionPurchase] Subscription duration months:",
    subscriptionDurationMonths,
  );

  // Calculate subscription dates
  const startDate = new Date();
  const expiryDate = new Date(startDate);
  expiryDate.setMonth(expiryDate.getMonth() + subscriptionDurationMonths);

  console.log(
    "[handleSubscriptionPurchase] Start date:",
    startDate.toISOString(),
  );
  console.log(
    "[handleSubscriptionPurchase] Expiry date:",
    expiryDate.toISOString(),
  );
  console.log("[handleSubscriptionPurchase] Updating user subscription...");

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
  console.log("[handleSubscriptionPurchase] ✓ User subscription updated");

  // Force refresh session cache to prevent race conditions
  // This ensures user immediately sees their new subscription status
  console.log("[handleSubscriptionPurchase] Force refreshing user session...");
  const refreshResult = await forceRefreshUserSession(userId, {
    maxRetries: 3,
  });
  if (!refreshResult.success) {
    console.error(
      "[handleSubscriptionPurchase] ✗ Session refresh failed (will be consistent eventually):",
      refreshResult.error,
    );
    // Fallback: confirm invalidation at minimum
    if (user?.email) {
      console.log(
        "[handleSubscriptionPurchase] Attempting session invalidation fallback...",
      );
      await invalidateSessionWithConfirmation(user.email, userId);
    }
  } else {
    console.log(
      "[handleSubscriptionPurchase] ✓ Session refreshed successfully for:",
      userId,
    );
  }

  // Create transaction record
  console.log("[handleSubscriptionPurchase] Creating transaction record...");
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
  console.log(
    "[handleSubscriptionPurchase] ✓ Transaction created:",
    transaction._id,
  );

  console.log(
    "[handleSubscriptionPurchase] ✓✓✓ Subscription purchase completed successfully",
  );
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
    "[handleSubscriptionUpdated] Subscription updated:",
    subscription.id,
    subscription.status,
  );

  const tierId = subscription.metadata?.tierId;
  const userId = subscription.metadata?.userId;

  console.log("[handleSubscriptionUpdated] Tier ID from metadata:", tierId);
  console.log("[handleSubscriptionUpdated] User ID from metadata:", userId);

  // First, try to find user by subscription ID (works for plan changes)
  console.log(
    "[handleSubscriptionUpdated] Looking up user by subscription ID...",
  );
  let user = await User.findOne({
    "subscription.stripeSubscriptionId": subscription.id,
  });

  // Fallback to userId from metadata (for new subscriptions)
  if (!user && userId) {
    console.log(
      "[handleSubscriptionUpdated] User not found by subscription ID, trying metadata userId...",
    );
    user = await User.findById(userId);
  }

  if (!user) {
    console.warn(
      "[handleSubscriptionUpdated] ⚠ User not found for subscription:",
      subscription.id,
    );
    return NextResponse.json({ received: true });
  }

  console.log("[handleSubscriptionUpdated] ✓ User found:", user.email);

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

      const sub = subscription as StripeSubscriptionWithPeriodEnd;
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
  console.log(
    "[handleSubscriptionDeleted] Subscription deleted:",
    subscription.id,
  );
  console.log("[handleSubscriptionDeleted] Customer:", subscription.customer);
  console.log("[handleSubscriptionDeleted] Status:", subscription.status);

  const result = await deactivateSubscription(subscription.id);

  if (!result.success) {
    console.error(
      "[handleSubscriptionDeleted] ✗ Failed to deactivate subscription:",
      result.message,
    );
  } else {
    console.log(
      "[handleSubscriptionDeleted] ✓ Subscription deactivated successfully",
    );
  }

  return NextResponse.json({ success: true });
}

/**
 * Handle invoice.paid event - subscription renewal
 */
async function handleInvoicePaidEvent(invoice: Stripe.Invoice) {
  console.log("[handleInvoicePaidEvent] Invoice paid:", invoice.id);
  console.log(
    "[handleInvoicePaidEvent] Amount paid:",
    invoice.amount_paid / 100,
  );
  console.log("[handleInvoicePaidEvent] Currency:", invoice.currency);

  // Only handle subscription invoices
  const legacyInvoice = invoice as unknown as LegacyInvoiceSubscription;
  const subscriptionRef =
    invoice.parent?.subscription_details?.subscription ??
    legacyInvoice.subscription ??
    null;

  if (!subscriptionRef) {
    console.log(
      "[handleInvoicePaidEvent] No subscription reference - skipping",
    );
    return NextResponse.json({ received: true });
  }

  let stripeSubscriptionId: string;
  if (typeof subscriptionRef === "string") {
    stripeSubscriptionId = subscriptionRef;
  } else {
    stripeSubscriptionId = subscriptionRef.id;
  }

  console.log(
    "[handleInvoicePaidEvent] Stripe subscription ID:",
    stripeSubscriptionId,
  );

  const result = await handleInvoicePaid(invoice);
  console.log(
    "[handleInvoicePaidEvent] Handle result:",
    result.success ? "✓ Success" : "✗ Failed",
  );

  if (result.success) {
    // Create transaction record for renewal
    console.log(
      "[handleInvoicePaidEvent] Looking up user for transaction record...",
    );
    const user = await User.findOne({
      "subscription.stripeSubscriptionId": stripeSubscriptionId,
    });

    if (user) {
      console.log("[handleInvoicePaidEvent] ✓ User found:", user.email);
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
      console.log(
        "[handleInvoicePaidEvent] ✓ Renewal transaction created:",
        transaction._id,
      );
    } else {
      console.warn(
        "[handleInvoicePaidEvent] ⚠ User not found for subscription:",
        stripeSubscriptionId,
      );
    }
  }

  return NextResponse.json({ success: true });
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log(
    "[handleInvoicePaymentFailed] Invoice payment failed:",
    invoice.id,
  );
  console.log(
    "[handleInvoicePaymentFailed] Subscription:",
    (invoice as StripeInvoiceWithSubscription).subscription,
  );
  console.log(
    "[handleInvoicePaymentFailed] Amount due:",
    invoice.amount_due / 100,
  );

  const result = await handlePaymentFailed(invoice);
  console.log(
    "[handleInvoicePaymentFailed] Result:",
    result.success ? "✓ Success" : "✗ Failed",
  );

  // TODO: Send notification email to user about failed payment

  return NextResponse.json({ success: true });
}

/**
 * Handle invoice.upcoming event - sent ~30 days before subscription renewal
 */
async function handleInvoiceUpcoming(invoice: Stripe.Invoice) {
  console.log("[handleInvoiceUpcoming] Upcoming invoice:", invoice.id);
  console.log("[handleInvoiceUpcoming] Amount due:", invoice.amount_due / 100);

  // Get subscription and user info
  const legacyInvoice = invoice as unknown as LegacyInvoiceSubscription;
  const subscriptionRef =
    invoice.parent?.subscription_details?.subscription ??
    legacyInvoice.subscription ??
    null;

  if (!subscriptionRef) {
    console.log("[handleInvoiceUpcoming] No subscription reference found");
    return NextResponse.json({ received: true });
  }

  let stripeSubscriptionId: string;
  if (typeof subscriptionRef === "string") {
    stripeSubscriptionId = subscriptionRef;
  } else {
    stripeSubscriptionId = subscriptionRef.id;
  }

  console.log(
    "[handleInvoiceUpcoming] Stripe subscription ID:",
    stripeSubscriptionId,
  );

  const user = await User.findOne({
    "subscription.stripeSubscriptionId": stripeSubscriptionId,
  });

  if (user && user.email) {
    const amount = invoice.amount_due ? invoice.amount_due / 100 : 0;
    const renewalDate = invoice.next_payment_attempt
      ? new Date(invoice.next_payment_attempt * 1000)
      : null;

    console.log(
      `[handleInvoiceUpcoming] ✓ Upcoming renewal for ${user.email}: $${amount} on ${renewalDate?.toLocaleDateString()}`,
    );

    // TODO: Send email notification to user about upcoming renewal
    // await sendNotification(user._id.toString(), {
    //   type: 'subscription_renewal_reminder',
    //   title: 'Subscription Renewal Reminder',
    //   message: `Your subscription will renew on ${renewalDate?.toLocaleDateString()} for $${amount}`,
    // });
  } else {
    console.warn(
      "[handleInvoiceUpcoming] ⚠ User not found for subscription:",
      stripeSubscriptionId,
    );
  }

  return NextResponse.json({ success: true });
}

/**
 * Handle payment_intent.created event
 */
async function handlePaymentIntentCreated(paymentIntent: Stripe.PaymentIntent) {
  console.log(
    "[handlePaymentIntentCreated] Payment intent created:",
    paymentIntent.id,
    "Amount:",
    paymentIntent.amount / 100,
  );
  console.log("[handlePaymentIntentCreated] Currency:", paymentIntent.currency);
  console.log("[handlePaymentIntentCreated] Status:", paymentIntent.status);

  // Log payment intent creation for audit trail
  // Can be used to track payment flow and detect issues early
  if (paymentIntent.metadata?.userId) {
    console.log(
      `[handlePaymentIntentCreated] Payment intent ${paymentIntent.id} created for user ${paymentIntent.metadata.userId}`,
    );
  }
}

/**
 * Handle payment_intent.payment_failed event
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(
    "[handlePaymentIntentFailed] Payment intent failed:",
    paymentIntent.id,
    "Error:",
    paymentIntent.last_payment_error?.message,
  );
  console.log(
    "[handlePaymentIntentFailed] Error code:",
    paymentIntent.last_payment_error?.code,
  );
  console.log(
    "[handlePaymentIntentFailed] Amount:",
    paymentIntent.amount / 100,
  );

  const userId = paymentIntent.metadata?.userId;
  if (!userId) {
    console.warn("[handlePaymentIntentFailed] ⚠ No userId in metadata");
    return;
  }

  console.log("[handlePaymentIntentFailed] User ID:", userId);

  // Mark transaction as failed if it exists
  const result = await Transaction.findOneAndUpdate(
    { gatewayTransactionId: paymentIntent.id },
    {
      $set: {
        status: "failed",
        "metadata.failureReason": paymentIntent.last_payment_error?.message,
        "metadata.failureCode": paymentIntent.last_payment_error?.code,
        "metadata.failedAt": new Date(),
      },
    },
  );

  if (result) {
    console.log(
      "[handlePaymentIntentFailed] ✓ Transaction updated:",
      result._id,
    );
  } else {
    console.warn(
      "[handlePaymentIntentFailed] ⚠ Transaction not found for payment intent:",
      paymentIntent.id,
    );
  }

  // TODO: Send notification to user about payment failure
  console.log(
    `[handlePaymentIntentFailed] Payment failed for user ${userId}: ${paymentIntent.last_payment_error?.message}`,
  );
}

/**
 * Handle charge.succeeded event
 */
async function handleChargeSucceeded(charge: Stripe.Charge) {
  console.log(
    "[handleChargeSucceeded] Charge succeeded:",
    charge.id,
    "Amount:",
    charge.amount / 100,
  );
  console.log("[handleChargeSucceeded] Payment intent:", charge.payment_intent);
  console.log("[handleChargeSucceeded] Customer:", charge.customer);

  // Update transaction with charge details for additional confirmation
  const result = await Transaction.findOneAndUpdate(
    { gatewayTransactionId: charge.payment_intent?.toString() || charge.id },
    {
      $set: {
        "metadata.chargeId": charge.id,
        "metadata.chargeSucceeded": true,
        "metadata.chargeSucceededAt": new Date(),
        "metadata.receiptUrl": charge.receipt_url,
      },
    },
  );

  if (result) {
    console.log("[handleChargeSucceeded] ✓ Transaction updated:", result._id);
  } else {
    console.warn(
      "[handleChargeSucceeded] ⚠ Transaction not found for charge:",
      charge.id,
    );
  }
}

/**
 * Handle charge.failed event
 */
async function handleChargeFailed(charge: Stripe.Charge) {
  console.log(
    "[handleChargeFailed] Charge failed:",
    charge.id,
    "Error:",
    charge.failure_message,
  );
  console.log("[handleChargeFailed] Failure code:", charge.failure_code);
  console.log("[handleChargeFailed] Payment intent:", charge.payment_intent);

  // Update transaction with failure details
  const result = await Transaction.findOneAndUpdate(
    { gatewayTransactionId: charge.payment_intent?.toString() || charge.id },
    {
      $set: {
        status: "failed",
        "metadata.chargeId": charge.id,
        "metadata.chargeFailed": true,
        "metadata.chargeFailedAt": new Date(),
        "metadata.failureMessage": charge.failure_message,
        "metadata.failureCode": charge.failure_code,
      },
    },
  );

  if (result) {
    console.log(
      "[handleChargeFailed] ✓ Transaction updated to failed:",
      result._id,
    );
  } else {
    console.warn(
      "[handleChargeFailed] ⚠ Transaction not found for failed charge:",
      charge.id,
    );
  }

  // TODO: Send notification to user about charge failure
}

/**
 * Handle charge.refunded event
 * IMPORTANT: This handler is idempotent - it checks if refund was already
 * processed before deducting credits from buyer wallet.
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log(
    "[handleChargeRefunded] Charge refunded:",
    charge.id,
    "Refund amount:",
    charge.amount_refunded / 100,
  );

  const refundAmount = charge.amount_refunded / 100;
  const isPartialRefund = charge.amount_refunded < charge.amount;

  console.log("[handleChargeRefunded] Original amount:", charge.amount / 100);
  console.log("[handleChargeRefunded] Is partial refund:", isPartialRefund);
  console.log("[handleChargeRefunded] Payment intent:", charge.payment_intent);

  // Find the original transaction
  const originalTransaction = await Transaction.findOne({
    gatewayTransactionId: charge.payment_intent?.toString() || charge.id,
  });

  if (originalTransaction) {
    console.log(
      "[handleChargeRefunded] ✓ Original transaction found:",
      originalTransaction._id,
    );
    console.log(
      "[handleChargeRefunded] Transaction type:",
      originalTransaction.type,
    );

    // Check if already refunded - prevent duplicate processing
    if (originalTransaction.metadata?.refunded) {
      console.log(
        "[handleChargeRefunded] ↺ Transaction already marked as refunded, skipping duplicate processing",
      );
      return;
    }

    // Atomically mark as refunded and get the result
    const updatedTransaction = await Transaction.findOneAndUpdate(
      {
        _id: originalTransaction._id,
        "metadata.refunded": { $ne: true },
      },
      {
        $set: {
          "metadata.refunded": true,
          "metadata.refundedAt": new Date(),
          "metadata.refundAmount": refundAmount,
          "metadata.isPartialRefund": isPartialRefund,
        },
      },
      { new: true },
    );

    if (!updatedTransaction) {
      console.log(
        "[handleChargeRefunded] ↺ Could not update transaction (already refunded or concurrent update)",
      );
      return;
    }

    // Create a refund transaction (upsert to be idempotent)
    await Transaction.updateOne(
      {
        type: "refund",
        gatewayTransactionId: charge.id,
      },
      {
        $setOnInsert: {
          type: "refund",
          userId: originalTransaction.userId,
          amount: -refundAmount,
          currency: charge.currency || "usd",
          paymentGateway: "stripe",
          gatewayTransactionId: charge.id,
          status: "completed",
          metadata: {
            originalTransactionId: originalTransaction._id,
            chargeId: charge.id,
            isPartialRefund,
            refundAmount,
            originalAmount: charge.amount / 100,
            refundReason: charge.metadata?.refund_reason || "Not specified",
          },
        },
      },
      { upsert: true },
    );
    console.log("[handleChargeRefunded] ✓ Refund transaction upserted");

    console.log(
      `[handleChargeRefunded] Refund processed: ${isPartialRefund ? "Partial" : "Full"} refund of $${refundAmount}`,
    );

    // TODO: Send notification to user about refund
    // If this was a credit purchase, deduct from buyer's wallet
    // IMPORTANT: Only deduct if creditsApplied is true (credits were actually given)
    if (originalTransaction.type === "units_purchase") {
      const unitsToDeduct = originalTransaction.metadata?.unitsPurchased || 0;
      const creditsWereApplied =
        originalTransaction.metadata?.creditsApplied === true;

      if (unitsToDeduct > 0 && creditsWereApplied) {
        console.log(
          "[handleChargeRefunded] Deducting units from buyer wallet:",
          unitsToDeduct,
        );
        await Buyer.findByIdAndUpdate(originalTransaction.userId, {
          $inc: { walletUnit: -unitsToDeduct },
        });
        console.log(
          `[handleChargeRefunded] ✓ Deducted ${unitsToDeduct} units from buyer wallet due to refund`,
        );
      } else if (unitsToDeduct > 0 && !creditsWereApplied) {
        console.log(
          "[handleChargeRefunded] ℹ Credits were never applied for this transaction, skipping wallet deduction",
        );
      }
    }
  } else {
    console.warn(
      "[handleChargeRefunded] ⚠ Original transaction not found for charge:",
      charge.payment_intent || charge.id,
    );
  }
}
