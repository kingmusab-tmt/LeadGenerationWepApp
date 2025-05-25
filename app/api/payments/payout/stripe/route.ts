import { NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/user";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
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
        { status: 405 }
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
        { status: 400 }
      );
    }

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
        { status: 404 }
      );
    }

    // Convert amount to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(body.amount * 100);

    // Create transfer to the connected account
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: body.currency.toLowerCase(),
      destination: seller.stripeAccountId,
    });

    return NextResponse.json(
      {
        message: "Payout successful",
        transferId: transfer.id,
        amount: transfer.amount / 100,
        currency: transfer.currency,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Stripe payout error:", error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
