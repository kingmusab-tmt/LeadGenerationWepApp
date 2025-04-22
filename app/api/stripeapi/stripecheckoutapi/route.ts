import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});

export async function POST(req: NextRequest) {
  const { units, cost } = await req.json();
  // Get the user's session
  const userSession = await getServerSession(authOptions);
  if (!userSession) {
    // Check if the user is authenticated
    return NextResponse.json(
      // Return an error if the user is not authenticated
      { success: false, message: "User not authenticated" }, // Return an error message
      { status: 401 } // Return a 401 status code (Unauthorized)
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `${units} Lead Credits` },
            unit_amount: cost * 100, // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/dashboard/buyer/purchaseUnit?status=success`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard/buyer/purchaseUnit?status=canceled`,
      customer_email: userSession.user.email, // Pass the user's email
      metadata: {
        units: units.toString(), // Pass the number of units as metadata
      },
    });

    return NextResponse.json({ success: true, sessionUrl: session.url });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
