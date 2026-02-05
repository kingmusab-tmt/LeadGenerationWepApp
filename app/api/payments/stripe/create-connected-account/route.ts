import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  try {
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email,
    });

    return NextResponse.json({ success: true, accountId: account.id });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
