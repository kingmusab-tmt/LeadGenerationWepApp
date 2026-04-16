import { NextRequest } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/connectdb";
import { Transaction } from "@/models/transactions";
import { env } from "@/lib/env";
import {
  badRequest,
  internalError,
  successResponse,
} from "@/lib/api/error-handler";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
});

export async function GET(req: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return badRequest("sessionId is required");
  }

  try {
    // Check Stripe session status
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Also check our database for the transaction
    const transaction = await Transaction.findOne({
      gatewayTransactionId: sessionId,
    });

    return successResponse({
      paymentStatus:
        session.payment_status === "paid"
          ? "succeeded"
          : session.payment_status,
      session,
      transactionStatus: transaction?.status,
    });
  } catch (error) {
    console.error("[PaymentStatusAPI] GET error:", error);
    return internalError("Failed to verify payment status");
  }
}
