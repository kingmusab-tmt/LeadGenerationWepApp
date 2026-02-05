// The following code snippet modifies the checkout session creation to route credit purchases to the seller's Stripe account.
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { Tier } from "@/models/tier";
import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export async function POST(req: NextRequest) {
  await dbConnect();

  const { units, cost, tierId, durationMonths } = await req.json();
  const userSession = await getServerSession(authOptions);

  if (!userSession) {
    return NextResponse.json(
      { success: false, message: "User not authenticated" },
      { status: 401 },
    );
  }

  try {
    let sessionParams: Stripe.Checkout.SessionCreateParams;

    if (tierId) {
      // Handle subscription checkout - processed by platform's Stripe account
      const tier = await Tier.findById(tierId);
      if (!tier) {
        return NextResponse.json(
          { success: false, message: "Tier not found" },
          { status: 404 },
        );
      }

      const pricePerMonth = parseFloat(tier.discountedPrice || tier.price);
      const totalAmount = pricePerMonth * (durationMonths || 1);

      sessionParams = {
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${tier.name} Subscription (${durationMonths || 1} month${
                  durationMonths !== 1 ? "s" : ""
                })`,
              },
              unit_amount: Math.round(totalAmount * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.FRONTEND_URL}/checkout?plan=${tierId}&payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/checkout?plan=${tierId}&payment=canceled`,
        customer_email: userSession.user.email,
        metadata: {
          tierId,
          userId: userSession.user.id,
          durationMonths: (durationMonths || 1).toString(),
          purchaseType: "subscription",
        },
      };
    } else {
      const buyer = await Buyer.findOne({
        email: userSession.user.email,
      });
      if (!buyer) {
        return NextResponse.json(
          { success: false, message: "Buyer not found" },
          { status: 404 },
        );
      }
      const sellerId = buyer.registeredWith; // Assuming buyer has a sellerId field
      if (!units || !cost || !sellerId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Units, cost, and sellerId are required for credit purchases",
          },
          { status: 400 },
        );
      }

      // Get seller's Stripe account ID
      const seller = await User.findById(sellerId);
      if (!seller || !seller.stripeAccountId) {
        return NextResponse.json(
          {
            success: false,
            message: "Seller payment account not configured",
          },
          { status: 400 },
        );
      }

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
          // You can set application fee amount here if you take a platform cut
          application_fee_amount: Math.round(cost * 100 * 0.1), // 10% platform fee
        },
        success_url: `${process.env.FRONTEND_URL}/dashboard/buyer/purchaseUnit?status=success`,
        cancel_url: `${process.env.FRONTEND_URL}/dashboard/buyer/purchaseUnit?status=canceled`,
        customer_email: userSession.user.email,
        metadata: {
          units: units.toString(),
          userId: userSession.user.id,
          sellerId: buyer.registeredWith.toString(),
          purchaseType: "credits",
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
    });
  } catch (error: any) {
    console.error("Checkout session creation error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
