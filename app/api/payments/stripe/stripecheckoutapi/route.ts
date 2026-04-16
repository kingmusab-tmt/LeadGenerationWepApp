// The following code snippet modifies the checkout session creation to route credit purchases to the seller's Stripe account.
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createHash, randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { Tier } from "@/models/tier";
import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";
import { createSubscriptionCheckout } from "@/lib/stripeSubscriptionService";
import { env } from "@/lib/env";
import {
  badRequest,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
});

export async function POST(req: NextRequest) {
  await dbConnect();

  let body: {
    units?: number;
    cost?: number;
    tierId?: string;
    billingInterval?: "month" | "year";
    idempotencyKey?: string;
  };
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON in request body");
  }

  const {
    units,
    cost,
    tierId,
    billingInterval = "month",
    idempotencyKey: bodyIdempotencyKey,
  } = body;
  const userSession = await getServerSession(authOptions);

  if (!userSession) {
    return unauthorized("User not authenticated");
  }

  try {
    let sessionParams: Stripe.Checkout.SessionCreateParams;

    if (tierId) {
      // Handle subscription checkout using the subscription service
      const tier = await Tier.findById(tierId);
      if (!tier) {
        return notFound("Tier");
      }

      // For free tiers, don't create Stripe checkout
      if (tier.tierType === "free") {
        return badRequest("Free tier does not require payment checkout");
      }

      // Use the subscription service for recurring billing
      const result = await createSubscriptionCheckout(
        userSession.user.id,
        tierId,
        billingInterval as "month" | "year",
        `${env.NEXTAUTH_URL}/checkout?plan=${tierId}&payment=success&session_id={CHECKOUT_SESSION_ID}`,
        `${env.NEXTAUTH_URL}/checkout?plan=${tierId}&payment=canceled`,
      );

      if (!result.success) {
        return badRequest(
          result.message || "Failed to create checkout session",
        );
      }

      return NextResponse.json({
        success: true,
        sessionId: result.sessionId,
        sessionUrl: result.sessionUrl,
      });
    } else {
      // Handle credit purchases (one-time payment to seller)
      const buyer = await Buyer.findOne({
        email: userSession.user.email,
      });
      if (!buyer) {
        return notFound("Buyer");
      }
      const sellerId = buyer.registeredWith; // Assuming buyer has a sellerId field
      if (!units || !cost || !sellerId) {
        return badRequest(
          "Units, cost, and sellerId are required for credit purchases",
        );
      }

      // Get seller's Stripe account ID
      const seller = await User.findById(sellerId);
      if (!seller || !seller.stripeAccountId) {
        return badRequest("Seller payment account not configured");
      }

      const sellerAccount = await stripe.accounts.retrieve(
        seller.stripeAccountId,
      );

      if (!sellerAccount.charges_enabled || !sellerAccount.payouts_enabled) {
        return badRequest(
          "Seller payout account is not fully enabled. Please complete Stripe onboarding.",
        );
      }

      const headerIdempotencyKey = req.headers.get("x-idempotency-key");
      const idempotencyKey =
        bodyIdempotencyKey ||
        headerIdempotencyKey ||
        createHash("sha256")
          .update(
            `${userSession.user.id}:${sellerId}:${units}:${cost}:${randomBytes(8).toString("hex")}`,
          )
          .digest("hex");

      sessionParams = {
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${units} Lead Credits`,
                // Include seller information if needed
                metadata: {
                  sellerId: sellerId.toString(),
                  sellerName: seller.name || seller.email,
                },
              },
              unit_amount: Math.round(cost * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        payment_intent_data: {
          // This routes the payment to the seller's Stripe account
          transfer_data: {
            destination: seller.stripeAccountId,
          },
        },
        success_url: `${env.NEXTAUTH_URL}/dashboard/buyer/purchaseUnit?status=success`,
        cancel_url: `${env.NEXTAUTH_URL}/dashboard/buyer/purchaseUnit?status=canceled`,
        customer_email: userSession.user.email,
        metadata: {
          units: units.toString(),
          userId: userSession.user.id,
          sellerId: sellerId.toString(),
          purchaseType: "credits",
        },
      };

      const session = await stripe.checkout.sessions.create(sessionParams, {
        idempotencyKey,
      });

      return NextResponse.json({
        success: true,
        sessionId: session.id,
        sessionUrl: session.url,
        idempotencyKey,
      });
    }
  } catch (error: unknown) {
    console.error("Checkout session creation error:", error);
    return internalError("Internal server error");
  }
}
