import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Transaction } from "@/models/transactions";
import { dollarTransactionCents } from "@/lib/transactionMoney";
import { IdempotencyKey } from "@/models/idempotencyKey";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";
import {
  badRequest,
  conflict,
  forbidden,
  internalError,
  paymentRequired,
  successResponse,
  unauthorized,
} from "@/lib/api/error-handler";
import { env } from "@/lib/env";
import { isSupportedCurrency } from "@/lib/currency";

import { isSellerRole } from "@/lib/roles";
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
});

interface StripePayoutRequest {
  amount: number;
  currency: string;
}

const IDEMPOTENCY_SCOPE = "payments:payout:stripe";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isMongoDuplicateKeyError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session?.user?.email) {
    return unauthorized("Authentication required");
  }

  const rateLimited = await checkSimpleRateLimit(req, {
    scope: IDEMPOTENCY_SCOPE,
    limit: 10,
    windowMs: 10 * 60 * 1000,
    actorId: session.user.id,
  });
  if (rateLimited) return rateLimited;

  const idempotencyKey = req.headers.get("Idempotency-Key");
  if (!idempotencyKey || !UUID_PATTERN.test(idempotencyKey)) {
    return badRequest("A valid Idempotency-Key header (UUID) is required");
  }

  let body: StripePayoutRequest;
  try {
    body = (await req.json()) as StripePayoutRequest;
  } catch {
    return badRequest("Invalid JSON in request body");
  }

  // Validate input
  if (!body.amount || !body.currency) {
    return badRequest("Missing required fields");
  }
  const currency = body.currency.toLowerCase();
  if (!isSupportedCurrency(currency)) {
    return badRequest(`Unsupported currency: ${body.currency}`);
  }

  await dbConnect();

  // The insert IS the atomic claim — a unique index on (key, scope) means at
  // most one request with this key can ever create this document, so a
  // double-click or a client retry racing the original can't both reach the
  // Stripe transfer/payout calls below.
  try {
    await IdempotencyKey.create({
      key: idempotencyKey,
      scope: IDEMPOTENCY_SCOPE,
      actorId: session.user.id,
      status: "processing",
    });
  } catch (error) {
    if (isMongoDuplicateKeyError(error)) {
      const existing = await IdempotencyKey.findOne({
        key: idempotencyKey,
        scope: IDEMPOTENCY_SCOPE,
      }).lean();
      if (existing?.status === "completed") {
        // Most cached outcomes are a real success, but the "funds not yet
        // available" branch below also marks itself completed (to block a
        // retry from re-debiting the wallet or re-transferring) while
        // reporting success: false — replay that one with its original
        // shape and status instead of always wrapping as a 200 success.
        const cached = existing.responseBody as
          | { success?: boolean; error?: string }
          | undefined;
        if (cached?.success === false) {
          return NextResponse.json(cached, { status: 400 });
        }
        return successResponse(existing.responseBody);
      }
      return conflict(
        "A request with this idempotency key is already being processed. Please wait and try again.",
      );
    }
    throw error;
  }

  // From here on, any early return or thrown error must release the claim
  // above — otherwise a legitimate retry (e.g. after a transient Stripe or
  // DB error) would be locked out for the full 24h TTL instead of being
  // able to proceed immediately.
  const releaseClaim = () =>
    IdempotencyKey.deleteOne({
      key: idempotencyKey,
      scope: IDEMPOTENCY_SCOPE,
    }).catch(() => {});

  // Once the Stripe transfer succeeds, the wallet debit is real and
  // irreversible-in-practice (rolling it back requires another write that
  // could itself fail). If anything after that point throws, the generic
  // catch below must NOT release the idempotency claim — a retry would
  // redo the wallet debit and create a second real Stripe transfer instead
  // of safely replaying. Marking it "completed" (with no responseBody)
  // makes a retry surface a clear conflict instead of silently duplicating
  // money movement; recovering the stuck transaction becomes a manual
  // admin/support action from here, same as any other post-transfer failure
  // this route could already hit before this fix.
  let transferSucceeded = false;

  try {
    const seller = await User.findOne({
      email: session.user.email,
    }).select("role stripeAccountId walletBalance name email");

    if (!seller || !isSellerRole(seller.role)) {
      await releaseClaim();
      return forbidden("Payout access requires a seller account");
    }

    if (!seller.stripeAccountId) {
      await releaseClaim();
      return forbidden("Stripe account not linked");
    }

    // Convert amount to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(body.amount * 100);

    // Fetch platform account balance
    const balance = await stripe.balance.retrieve();

    const availableBalance = balance.available.find(
      (bal) => bal.currency.toLowerCase() === currency,
    );

    if (!availableBalance || availableBalance.amount < amountInCents) {
      await releaseClaim();
      return paymentRequired("Insufficient funds in platform Stripe account");
    }

    // Atomically claim the wallet balance before touching Stripe — a
    // read-then-write here would let two concurrent payout requests both
    // pass a "walletBalance >= amount" check and both debit, driving the
    // wallet negative. The condition on the update itself is the guard.
    const debitedSeller = await User.findOneAndUpdate(
      { _id: session.user.id, walletBalance: { $gte: body.amount } },
      { $inc: { walletBalance: -body.amount } },
      { new: true },
    );
    if (!debitedSeller) {
      await releaseClaim();
      return badRequest("Insufficient wallet balance");
    }

    let transfer: Stripe.Transfer;
    try {
      // Create transfer to the connected account
      transfer = await stripe.transfers.create(
        {
          amount: amountInCents,
          currency,
          destination: seller.stripeAccountId,
          transfer_group: `SELLER_WITHDRAWAL_${session.user.id}_${Date.now()}`,
        },
        { idempotencyKey: `payout-transfer-${idempotencyKey}` },
      );
      transferSucceeded = true;
    } catch (stripeError) {
      // Stripe call failed — roll back the wallet debit so the seller isn't
      // left short a balance with no transfer to show for it.
      await User.updateOne(
        { _id: session.user.id },
        { $inc: { walletBalance: body.amount } },
      );
      await releaseClaim();
      console.error("[StripePayoutAPI] Transfer failed:", stripeError);
      return internalError(
        stripeError instanceof Error
          ? `Stripe transfer failed: ${stripeError.message}`
          : "Stripe transfer failed",
      );
    }

    // Save transaction record
    const payoutPreviousBalance = debitedSeller.walletBalance + body.amount;
    const transaction = new Transaction({
      type: "seller_payout",
      userId: session.user.id,
      amount: body.amount,
      currency,
      previousBalance: payoutPreviousBalance,
      currentBalance: debitedSeller.walletBalance,
      ...dollarTransactionCents("seller_payout", {
        amount: body.amount,
        previousBalance: payoutPreviousBalance,
        currentBalance: debitedSeller.walletBalance,
      }),
      status: "pending",
      paymentGateway: "stripe",
      gatewayTransactionId: transfer.id,
      stripeAccountId: seller.stripeAccountId,
      metadata: {
        stripeTransferId: transfer.id,
        sellerId: session.user.id,
        sellerName: seller.name || "Unknown",
        sellerEmail: seller.email || "N/A",
      },
    });

    await transaction.save();

    // Step 1.5: Check seller's balance
    const userbalance = await stripe.balance.retrieve({
      stripeAccount: seller.stripeAccountId,
    });

    const availableInCurrency = userbalance.available.find(
      (b) => b.currency === currency,
    );

    if (!availableInCurrency || availableInCurrency.amount < amountInCents) {
      // The transfer already succeeded and is recorded as a "pending"
      // transaction — this isn't a failure to roll back, the funds just
      // aren't settled on the connected account yet for an instant payout.
      await IdempotencyKey.updateOne(
        { key: idempotencyKey, scope: IDEMPOTENCY_SCOPE },
        {
          $set: {
            status: "completed",
            responseBody: {
              success: false,
              error: "Transferred funds not yet available for payout.",
            },
          },
        },
      );
      return NextResponse.json(
        {
          success: false,
          error: "Transferred funds not yet available for payout.",
        },
        { status: 400 },
      );
    }

    // Step 2: Create payout from seller’s Stripe balance to their bank account
    const payout = await stripe.payouts.create(
      {
        amount: amountInCents,
        currency,
        // Optional: specify destination bank account
      },
      {
        stripeAccount: seller.stripeAccountId,
        idempotencyKey: `payout-payout-${idempotencyKey}`,
      },
    );

    const responseBody = {
      message: "Payout initiated successfully.",
      transferId: transfer.id,
      payoutId: payout.id,
      updatedBalance: debitedSeller.walletBalance,
    };

    await IdempotencyKey.updateOne(
      { key: idempotencyKey, scope: IDEMPOTENCY_SCOPE },
      { $set: { status: "completed", responseBody } },
    );

    return NextResponse.json({
      success: true,
      data: responseBody,
    });
  } catch (error: unknown) {
    if (transferSucceeded) {
      await IdempotencyKey.updateOne(
        { key: idempotencyKey, scope: IDEMPOTENCY_SCOPE },
        {
          $set: {
            status: "completed",
            responseBody: {
              success: false,
              error:
                "Payout transfer succeeded but a later step failed to complete. Contact support before retrying.",
            },
          },
        },
      );
    } else {
      await releaseClaim();
    }
    console.error("[StripePayoutAPI] POST error:", error);
    return internalError(
      transferSucceeded
        ? "Payout transfer succeeded but a later step failed to complete. Contact support before retrying — do not resubmit."
        : "An error occurred while initiating payout.",
    );
  }
}
