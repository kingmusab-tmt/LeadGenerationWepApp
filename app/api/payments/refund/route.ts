import Stripe from "stripe";
import dbConnect from "@/lib/connectdb";
import Call from "@/models/call";
import { User } from "@/models";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  badRequest,
  forbidden,
  internalError,
  unauthorized,
} from "@/lib/api/error-handler";
import { env } from "@/lib/env";

// Ensure the Stripe secret key is defined
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover", // Use the latest Stripe API version
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return unauthorized("Authentication required");
    }

    await dbConnect();

    const actor = await User.findOne({ email: session.user.email }).select(
      "role name email",
    );
    if (!actor || (actor.role !== "seller" && actor.role !== "admin")) {
      return forbidden("Refund access requires a seller or admin account");
    }

    let body: { callId?: string };
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON in request body");
    }

    const { callId } = body;

    if (!callId) {
      return badRequest("callId is required");
    }

    const call = await Call.findById(callId);
    if (!call || call.paymentStatus !== "paid") {
      return badRequest("Invalid call or already refunded");
    }

    if (actor.role !== "admin" && String(call.userId) !== String(actor._id)) {
      return forbidden("You can only refund your own calls");
    }

    if (!call.paymentIntentId) {
      return badRequest("Call is missing a payment intent reference");
    }

    // Initiate Refund
    await stripe.refunds.create({ payment_intent: call.paymentIntentId });

    // Update Call Status
    call.paymentStatus = "refunded";
    await call.save();

    return NextResponse.json({ success: true, message: "Refund processed" });
  } catch (error) {
    console.error("Refund failed:", error);
    return internalError("Refund failed");
  }
}
