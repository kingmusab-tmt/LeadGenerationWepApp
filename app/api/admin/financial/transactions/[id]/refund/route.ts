import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import Stripe from "stripe";
import { Transaction } from "@/models/transactions";
import dbConnect from "@/lib/connectdb";
import { requireSuperAdmin } from "@/lib/api/adminAuth";
import { recordAuditLog } from "@/lib/auditLog";
import { badRequest, internalError, notFound } from "@/lib/api/error-handler";
import { env } from "@/lib/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
});

// Transaction types that represent a customer charge going the platform's/
// seller's way — the only kind a "refund to the customer" action is
// semantically correct for. seller_payout/seller_income/admin_adjustment
// etc. are not customer charges and need a payout reversal or manual
// balance adjustment instead, not stripe.refunds.create.
const REFUNDABLE_TRANSACTION_TYPES = new Set([
  "lead_purchase",
  "call_purchase",
  "units_purchase",
  "subscription_payment",
  "subscription_renewal",
]);

type RefundTarget = { payment_intent: string } | { charge: string };

// gatewayTransactionId holds different Stripe object id shapes depending on
// how the transaction was recorded (see stripewebhook/route.ts) — a
// PaymentIntent, a Charge, a Checkout Session, or an Invoice id. Stripe's
// refund API only accepts a PaymentIntent or a Charge, so session/invoice
// ids need one extra lookup to resolve the underlying charge.
async function resolveRefundTarget(
  gatewayTransactionId: string,
): Promise<RefundTarget | null> {
  if (gatewayTransactionId.startsWith("pi_")) {
    return { payment_intent: gatewayTransactionId };
  }
  if (gatewayTransactionId.startsWith("ch_")) {
    return { charge: gatewayTransactionId };
  }
  if (gatewayTransactionId.startsWith("cs_")) {
    const checkoutSession =
      await stripe.checkout.sessions.retrieve(gatewayTransactionId);
    const paymentIntentId =
      typeof checkoutSession.payment_intent === "string"
        ? checkoutSession.payment_intent
        : checkoutSession.payment_intent?.id;
    return paymentIntentId ? { payment_intent: paymentIntentId } : null;
  }
  if (gatewayTransactionId.startsWith("in_")) {
    // Modern Stripe API versions moved the payment reference off Invoice
    // itself and onto its InvoicePayment records.
    const invoice = await stripe.invoices.retrieve(gatewayTransactionId, {
      expand: ["payments.data.payment.payment_intent"],
    });
    const payment = invoice.payments?.data?.[0]?.payment;
    const paymentIntentId =
      typeof payment?.payment_intent === "string"
        ? payment.payment_intent
        : payment?.payment_intent?.id;
    if (paymentIntentId) return { payment_intent: paymentIntentId };
    const chargeId =
      typeof payment?.charge === "string" ? payment.charge : payment?.charge?.id;
    return chargeId ? { charge: chargeId } : null;
  }
  // Subscription ids (sub_...) and anything else aren't a single refundable
  // charge — don't guess, surface it so an admin handles it in the Stripe
  // Dashboard instead of silently doing nothing (or the wrong thing).
  return null;
}

// Refunds are irreversible and move real money, so this requires
// super-admin rather than the standard admin check.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, actor } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;

  try {
    await dbConnect();

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return notFound("Transaction");
    }

    if (transaction.status === "refunded") {
      return badRequest("Transaction has already been refunded");
    }

    if (transaction.status !== "completed") {
      return badRequest("Only completed transactions can be refunded");
    }

    if (!REFUNDABLE_TRANSACTION_TYPES.has(transaction.type)) {
      return badRequest(
        `Transactions of type "${transaction.type}" are not customer charges and can't be refunded through this action. Use a payout reversal or manual balance adjustment instead.`,
      );
    }

    if (transaction.paymentGateway !== "stripe" || !transaction.gatewayTransactionId) {
      return badRequest(
        "This transaction has no associated Stripe payment reference and can't be refunded automatically.",
      );
    }

    const refundTarget = await resolveRefundTarget(
      transaction.gatewayTransactionId,
    );
    if (!refundTarget) {
      return badRequest(
        "Could not resolve a refundable Stripe charge for this transaction. Refund it directly in the Stripe Dashboard.",
      );
    }

    // Atomically claim the transaction before touching Stripe so two
    // concurrent refund clicks can't both pass the status check above and
    // both attempt to move money. If another request already claimed it,
    // this matches nothing and we stop here instead of calling Stripe twice.
    const claimed = await Transaction.findOneAndUpdate(
      { _id: id, status: "completed" },
      { $set: { status: "refunded" } },
    );
    if (!claimed) {
      return badRequest(
        "Transaction is no longer eligible for refund (already claimed by another request).",
      );
    }

    let stripeRefund: Stripe.Refund;
    try {
      stripeRefund = await stripe.refunds.create(
        {
          ...refundTarget,
          reason: "requested_by_customer",
          metadata: {
            adminRefund: "true",
            transactionId: id,
            adminActorEmail: actor?.email ?? "",
          },
        },
        { idempotencyKey: `admin-refund-${id}` },
      );
    } catch (stripeError) {
      // Stripe call failed — roll back the claim so the transaction can be
      // retried instead of being stuck marked "refunded" with no refund.
      await Transaction.updateOne(
        { _id: id, status: "refunded" },
        { $set: { status: "completed" } },
      );
      console.error("Stripe refund failed:", stripeError);
      return internalError(
        stripeError instanceof Error
          ? `Stripe refund failed: ${stripeError.message}`
          : "Stripe refund failed",
      );
    }

    // Create a refund transaction record
    await Transaction.create({
      type: "refund",
      userId: transaction.userId,
      amount: transaction.amount,
      previousBalance: 0,
      currentBalance: 0,
      currency: transaction.currency || "USD",
      paymentGateway: transaction.paymentGateway,
      gatewayTransactionId: stripeRefund.id,
      status: "completed",
      metadata: {
        ...transaction.metadata,
        refund: true,
        refundReason: "Admin-initiated refund",
        refundedTransactionId: transaction._id,
        refundAmount: transaction.amount,
      },
    });

    await recordAuditLog({
      actor: actor!,
      action: "transaction.refund",
      targetType: "Transaction",
      targetId: id,
      summary: `Refunded ${transaction.currency || "USD"} ${transaction.amount} transaction for user ${transaction.userId} via Stripe (${stripeRefund.id})`,
      metadata: {
        amount: transaction.amount,
        currency: transaction.currency,
        originalType: transaction.type,
        userId: String(transaction.userId),
        stripeRefundId: stripeRefund.id,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: "Refund processed successfully",
      stripeRefundId: stripeRefund.id,
    });
  } catch (err) {
    console.error("Failed to process refund:", err);
    return internalError("Failed to process refund");
  }
}
