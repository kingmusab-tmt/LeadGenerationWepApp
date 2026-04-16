import { NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Transaction } from "@/models/transactions";
import {
  badRequest,
  forbidden,
  internalError,
  paymentRequired,
  unauthorized,
} from "@/lib/api/error-handler";
import { env } from "@/lib/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
});

interface StripePayoutRequest {
  amount: number;
  currency: string;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return unauthorized("Authentication required");
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
    await dbConnect();
    const seller = await User.findOne({
      email: session.user.email,
    }).select("role stripeAccountId walletBalance name email");

    if (!seller || seller.role !== "seller") {
      return forbidden("Payout access requires a seller account");
    }

    if (!seller.stripeAccountId) {
      return forbidden("Stripe account not linked");
    }

    if (seller.walletBalance < body.amount) {
      return badRequest("Insufficient wallet balance");
    }

    // Convert amount to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(body.amount * 100);

    // Fetch platform account balance
    const balance = await stripe.balance.retrieve();
    //("Available:", balance.available);

    const availableBalance = balance.available.find(
      (bal) => bal.currency.toLowerCase() === body.currency.toLowerCase(),
    );

    if (!availableBalance || availableBalance.amount < amountInCents) {
      return paymentRequired("Insufficient funds in platform Stripe account");
    }

    // Proceed with transfer
    // Create transfer to the connected account
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: "usd",
      destination: seller.stripeAccountId,
      transfer_group: `SELLER_WITHDRAWAL_${session.user.id}_${Date.now()}`,
    });

    // Update seller’s wallet balance in DB
    const updatedSeller = await User.findByIdAndUpdate(
      session.user.id,
      { $inc: { walletBalance: -body.amount } },
      { new: true },
    );
    // Save transaction record
    const transaction = new Transaction({
      type: "seller_payout",
      userId: session.user.id,
      amount: body.amount,
      currency: "usd",
      previousBalance: (updatedSeller?.walletBalance || 0) + body.amount,
      currentBalance: updatedSeller?.walletBalance || 0,
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

    const availableUsd = userbalance.available.find(
      (b) => b.currency === "usd",
    );

    if (!availableUsd || availableUsd.amount < amountInCents) {
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
        currency: "usd",
        // Optional: specify destination bank account
      },
      {
        stripeAccount: seller.stripeAccountId,
      },
    );

    return NextResponse.json({
      success: true,
      data: {
        message: "Payout initiated successfully.",
        transferId: transfer.id,
        payoutId: payout.id,
        updatedBalance: updatedSeller?.walletBalance,
      },
    });
  } catch (error: unknown) {
    console.error("[StripePayoutAPI] POST error:", error);
    return internalError("An error occurred while initiating payout.");
  }
}
