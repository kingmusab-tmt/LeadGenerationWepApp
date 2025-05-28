import { NextResponse, NextRequest } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export async function POST(req: NextRequest) {
  try {
    const { paymentMethodId, tierId, amount, isYearly } = await req.json();

    // Validate required fields
    if (!paymentMethodId || !tierId || !amount) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          details: {
            paymentMethodId: !paymentMethodId ? "Missing" : "Provided",
            tierId: !tierId ? "Missing" : "Provided",
            amount: !amount ? "Missing" : "Provided",
          },
        },
        { status: 400 }
      );
    }

    // Validate and construct return URL
    const baseUrl = process.env.AUTH_URL;
    if (!baseUrl) {
      throw new Error("AUTH_URL environment variable is not set");
    }

    let returnUrl: string;
    try {
      returnUrl = new URL("/checkout/success", baseUrl).toString();
    } catch (err) {
      throw new Error(`Invalid AUTH_URL: ${baseUrl}`);
    }

    // Create payment intent with detailed error handling
    const paymentIntent = await stripe.paymentIntents
      .create({
        amount: Math.round(parseFloat(amount) * 100),
        currency: "usd",
        payment_method: paymentMethodId,
        confirm: true,
        return_url: returnUrl,
        metadata: {
          tierId,
          isYearly: String(isYearly),
          source: "nextjs-checkout",
        },
      })
      .catch((stripeErr) => {
        console.error("Stripe API Error:", stripeErr);
        throw new Error(
          `Stripe API Error: ${stripeErr.type} - ${stripeErr.message}`
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
        return NextResponse.json(
          {
            error: "Payment processing failed",
            paymentIntentStatus: paymentIntent.status,
            declineCode: paymentIntent.last_payment_error?.decline_code,
            paymentError: paymentIntent.last_payment_error?.message,
          },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Checkout Error:", error);

    return NextResponse.json(
      {
        error: "Payment processing failed",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        type: error.type || "server_error",
      },
      { status: 500 }
    );
  }
}
