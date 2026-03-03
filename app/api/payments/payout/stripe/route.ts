import { NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Transaction } from "@/models/transactions";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

interface StripePayoutRequest {
  amount: number;
  currency: string;
}

export async function POST(req: Request) {
  try {
    if (req.method !== "POST") {
      return NextResponse.json(
        { message: "Method not allowed" },
        { status: 405 },
      );
    }
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as StripePayoutRequest;

    // Validate input
    if (!body.amount || !body.currency) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 },
      );
    }
    await dbConnect();
    const seller = await User.findOne({
      email: session.user.email,
    });
    if (
      !seller ||
      !seller.stripeAccountId ||
      seller.walletBalance < body.amount
    ) {
      return NextResponse.json(
        {
          message:
            "Seller not found or Stripe account not linked or Insufficient Balance",
        },
        { status: 404 },
      );
    }

    await stripe.charges.create({
      amount: 5000, // $50
      currency: "usd",
      source: "tok_bypassPending", // Optional, use this to skip pending in test
      description: "Test funding charge",
    });

    // Convert amount to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(body.amount * 100);

    // Fetch platform account balance
    const balance = await stripe.balance.retrieve();
    //("Available:", balance.available);

    const availableBalance = balance.available.find(
      (bal) => bal.currency.toLowerCase() === body.currency.toLowerCase(),
    );

    if (!availableBalance || availableBalance.amount < amountInCents) {
      return NextResponse.json(
        { message: "Insufficient funds in platform Stripe account" },
        { status: 402 },
      );
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
      previousBalance: updatedSeller?.walletBalance || 0,
      currentBalance: (updatedSeller?.walletBalance || 0) - body.amount,
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
          message: "Transferred funds not yet available for payout.",
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
      message: "Payout initiated successfully.",
      transferId: transfer.id,
      payoutId: payout.id,
      updatedBalance: updatedSeller?.walletBalance,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "An error occurred while initiating payout.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
