import { NextResponse, NextRequest } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  badRequest,
  internalError,
  unauthorized,
} from "@/lib/api/error-handler";
import { env } from "@/lib/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    let body: {
      paymentMethodId?: string;
      tierId?: string;
      amount?: string | number;
      isYearly?: boolean;
    };
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON in request body");
    }

    const { paymentMethodId, tierId, amount, isYearly } = body;

    // Validate required fields
    if (!paymentMethodId || !tierId || !amount) {
      return badRequest("Missing required fields", {
        paymentMethodId: !paymentMethodId ? "Missing" : "Provided",
        tierId: !tierId ? "Missing" : "Provided",
        amount: !amount ? "Missing" : "Provided",
      });
    }

    const parsedAmount =
      typeof amount === "number" ? amount : parseFloat(String(amount));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return badRequest("Amount must be a positive number");
    }

    // Validate and construct return URL
    const returnUrl = new URL("/checkout/success", env.NEXTAUTH_URL).toString();

    // Create payment intent with detailed error handling
    const paymentIntent = await stripe.paymentIntents
      .create({
        amount: Math.round(parsedAmount * 100),
        currency: "usd",
        payment_method: paymentMethodId,
        confirm: true,
        return_url: returnUrl,
        metadata: {
          userId: session.user.id,
          tierId,
          isYearly: String(isYearly),
          source: "nextjs-checkout",
        },
      })
      .catch((stripeErr) => {
        console.error("Stripe API Error:", stripeErr);
        throw new Error(
          `Stripe API Error: ${stripeErr.type} - ${stripeErr.message}`,
        );
      });

    // Handle payment intent status
    switch (paymentIntent.status) {
      case "requires_action":
        return NextResponse.json({
          requiresAction: true,
          clientSecret: paymentIntent.client_secret,
          paymentIntentStatus: paymentIntent.status,
          paymentIntentId: paymentIntent.id,
        });

      case "succeeded":
        // Here you would create the subscription in your database
        return NextResponse.json({
          success: true,
          paymentIntentStatus: paymentIntent.status,
          paymentIntentId: paymentIntent.id,
          amountReceived: paymentIntent.amount_received,
        });

      default:
        return badRequest("Payment processing failed", {
          paymentIntentStatus: paymentIntent.status,
          declineCode: paymentIntent.last_payment_error?.decline_code,
          paymentError: paymentIntent.last_payment_error?.message,
        });
    }
  } catch (error: unknown) {
    console.error("Checkout Error:", error);
    return internalError("Payment processing failed");
  }
}
