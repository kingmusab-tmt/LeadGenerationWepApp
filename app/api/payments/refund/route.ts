import Stripe from "stripe";
import dbConnect from "@/lib/connectdb";
import Call from "@/models/call";
import { NextRequest, NextResponse } from "next/server";

// Ensure the Stripe secret key is defined
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is missing.");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover", // Use the latest Stripe API version
});

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { callId } = await req.json();

    const call = await Call.findById(callId);
    if (!call || call.paymentStatus !== "paid") {
      return new NextResponse(
        JSON.stringify({ error: "Invalid call or already refunded" }),
        { status: 400 },
      );
    }

    // Initiate Refund
    await stripe.refunds.create({ charge: call.paymentIntentId });

    // Update Call Status
    call.paymentStatus = "refunded";
    await call.save();

    return new NextResponse(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Refund failed:", error);
    return new NextResponse(JSON.stringify({ error: "Refund failed" }), {
      status: 500,
    });
  }
}
