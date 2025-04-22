import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});

export async function POST(req: NextRequest) {
  const { accountId, amount } = await req.json();

  try {
    const transfer = await stripe.transfers.create({
      amount: amount * 100, // Stripe uses cents
      currency: "usd",
      destination: accountId,
    });

    return NextResponse.json({ success: true, transferId: transfer.id });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
