// import { NextRequest, NextResponse } from "next/server";
// import Stripe from "stripe";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/auth";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: "2025-02-24.acacia",
// });

// export async function POST(req: NextRequest) {
//   const { units, cost } = await req.json();
//   // Get the user's session
//   const userSession = await getServerSession(authOptions);
//   if (!userSession) {
//     // Check if the user is authenticated
//     return NextResponse.json(
//       // Return an error if the user is not authenticated
//       { success: false, message: "User not authenticated" }, // Return an error message
//       { status: 401 } // Return a 401 status code (Unauthorized)
//     );
//   }

//   try {
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ["card"],
//       line_items: [
//         {
//           price_data: {
//             currency: "usd",
//             product_data: { name: `${units} Lead Credits` },
//             unit_amount: cost * 100, // Stripe uses cents
//           },
//           quantity: 1,
//         },
//       ],
//       mode: "payment",
//       success_url: `${process.env.FRONTEND_URL}/dashboard/buyer/purchaseUnit?status=success`,
//       cancel_url: `${process.env.FRONTEND_URL}/dashboard/buyer/purchaseUnit?status=canceled`,
//       customer_email: userSession.user.email, // Pass the user's email
//       metadata: {
//         units: units.toString(), // Pass the number of units as metadata
//       },
//     });

//     return NextResponse.json({ success: true, sessionUrl: session.url });
//   } catch (error) {
//     return NextResponse.json(
//       { success: false, message: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { Tier } from "@/models/tier";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export async function POST(req: NextRequest) {
  await dbConnect();

  const { units, cost, tierId, durationMonths } = await req.json();
  const userSession = await getServerSession(authOptions);

  if (!userSession) {
    return NextResponse.json(
      { success: false, message: "User not authenticated" },
      { status: 401 }
    );
  }

  try {
    // Determine if this is a credit purchase or subscription
    const isSubscription = !!tierId;
    let sessionParams: Stripe.Checkout.SessionCreateParams;

    if (isSubscription) {
      // Handle subscription checkout
      const tier = await Tier.findById(tierId);
      if (!tier) {
        return NextResponse.json(
          { success: false, message: "Tier not found" },
          { status: 404 }
        );
      }

      if (!tier.stripePriceId) {
        return NextResponse.json(
          {
            success: false,
            message: "Stripe price ID not configured for this tier",
          },
          { status: 400 }
        );
      }

      const totalAmount =
        parseFloat(tier.discountedPrice || "0") * (durationMonths || 1);

      sessionParams = {
        payment_method_types: ["card"],
        line_items: [
          {
            price: tier.stripePriceId,
            quantity: durationMonths || 1,
          },
        ],
        mode: "subscription", // Use subscription mode for recurring payments
        success_url: `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/checkout/cancel`,
        customer_email: userSession.user.email,
        metadata: {
          tierId,
          userId: userSession.user.id,
          durationMonths: (durationMonths || 1).toString(),
          purchaseType: "subscription",
        },
        subscription_data: {
          metadata: {
            tierId,
            userId: userSession.user.id,
          },
        },
      };
    } else {
      // Handle credit purchase
      if (!units || !cost) {
        return NextResponse.json(
          {
            success: false,
            message: "Units and cost are required for credit purchases",
          },
          { status: 400 }
        );
      }

      sessionParams = {
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: `${units} Lead Credits` },
              unit_amount: cost * 100,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.NEXTAUTH_URL}/dashboard/buyer/purchaseUnit?status=success`,
        cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/buyer/purchaseUnit?status=canceled`,
        customer_email: userSession.user.email,
        metadata: {
          units: units.toString(),
          userId: userSession.user.id,
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
      { status: 500 }
    );
  }
}
