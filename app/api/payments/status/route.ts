// pages/api/payments/status.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/connectdb";
import { Transaction } from "@/models/transactions";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export async function GET(req: Request) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 }
    );
  }

  try {
    // Check Stripe session status
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Also check our database for the transaction
    const transaction = await Transaction.findOne({
      gatewayTransactionId: sessionId,
    });

    return NextResponse.json({
      success:
        session.payment_status === "paid"
          ? "succeeded"
          : session.payment_status,
      session,
      transactionStatus: transaction?.status,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
