// import { NextRequest, NextResponse } from "next/server";
// import Stripe from "stripe";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/auth";
// import dbConnect from "@/lib/connectdb";
// import { Tier } from "@/models/tier";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: "2025-02-24.acacia",
// });

// export async function POST(req: NextRequest) {
//   await dbConnect();

//   const { units, cost, tierId, durationMonths } = await req.json();
//   const userSession = await getServerSession(authOptions);

//   if (!userSession) {
//     return NextResponse.json(
//       { success: false, message: "User not authenticated" },
//       { status: 401 }
//     );
//   }

//   try {
//     let sessionParams: Stripe.Checkout.SessionCreateParams;

//     if (tierId) {
//       // Handle subscription checkout
//       const tier = await Tier.findById(tierId);
//       if (!tier) {
//         return NextResponse.json(
//           { success: false, message: "Tier not found" },
//           { status: 404 }
//         );
//       }

//       const pricePerMonth = parseFloat(tier.discountedPrice || tier.price);
//       const totalAmount = pricePerMonth * (durationMonths || 1);

//       sessionParams = {
//         payment_method_types: ["card"],
//         line_items: [
//           {
//             price_data: {
//               currency: "usd",
//               product_data: {
//                 name: `${tier.name} Subscription (${durationMonths || 1} month${
//                   durationMonths !== 1 ? "s" : ""
//                 })`,
//               },
//               unit_amount: Math.round(totalAmount * 100), // Convert to cents
//             },
//             quantity: 1,
//           },
//         ],
//         mode: "payment",
//         success_url: `${process.env.AUTH_URL}/checkout?plan=${tierId}&payment=success&session_id={CHECKOUT_SESSION_ID}`,
//         cancel_url: `${process.env.AUTH_URL}/checkout?plan=${tierId}&payment=canceled`,
//         customer_email: userSession.user.email,
//         metadata: {
//           tierId,
//           userId: userSession.user.id,
//           durationMonths: (durationMonths || 1).toString(),
//           purchaseType: "subscription",
//         },
//       };
//     } else {
//       // Handle credit purchase
//       if (!units || !cost) {
//         return NextResponse.json(
//           {
//             success: false,
//             message: "Units and cost are required for credit purchases",
//           },
//           { status: 400 }
//         );
//       }

//       sessionParams = {
//         payment_method_types: ["card"],
//         line_items: [
//           {
//             price_data: {
//               currency: "usd",
//               product_data: { name: `${units} Lead Credits` },
//               unit_amount: Math.round(cost * 100),
//             },
//             quantity: 1,
//           },
//         ],
//         mode: "payment",
//         success_url: `${process.env.AUTH_URL}/dashboard/buyer/purchaseUnit?status=success`,
//         cancel_url: `${process.env.AUTH_URL}/dashboard/buyer/purchaseUnit?status=canceled`,
//         customer_email: userSession.user.email,
//         metadata: {
//           units: units.toString(),
//           userId: userSession.user.id,
//           purchaseType: "credits",
//         },
//       };
//     }

//     const session = await stripe.checkout.sessions.create(sessionParams);

//     return NextResponse.json({
//       success: true,
//       sessionId: session.id,
//       sessionUrl: session.url,
//     });
//   } catch (error: any) {
//     console.error("Checkout session creation error:", error);
//     return NextResponse.json(
//       {
//         success: false,
//         message: "Internal server error",
//         error: error.message,
//       },
//       { status: 500 }
//     );
//   }
// }
//above is the initial code snippet that would direct both credit and subscription purchases to the platform's Stripe account.

// The following code snippet modifies the checkout session creation to route credit purchases to the seller's Stripe account.
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { Tier } from "@/models/tier";
import { User } from "@/models/user";

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
  const sellerId = userSession.user.id;

  try {
    let sessionParams: Stripe.Checkout.SessionCreateParams;

    if (tierId) {
      // Handle subscription checkout - processed by platform's Stripe account
      const tier = await Tier.findById(tierId);
      if (!tier) {
        return NextResponse.json(
          { success: false, message: "Tier not found" },
          { status: 404 }
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
        success_url: `${process.env.AUTH_URL}/checkout?plan=${tierId}&payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.AUTH_URL}/checkout?plan=${tierId}&payment=canceled`,
        customer_email: userSession.user.email,
        metadata: {
          tierId,
          userId: userSession.user.id,
          durationMonths: (durationMonths || 1).toString(),
          purchaseType: "subscription",
        },
      };
    } else {
      // Handle credit purchase - processed by seller's Stripe account
      if (!units || !cost || !sellerId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Units, cost, and sellerId are required for credit purchases",
          },
          { status: 400 }
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
          { status: 400 }
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
                  sellerId: sellerId,
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
          // application_fee_amount: Math.round(cost * 100 * 0.1), // 10% platform fee
        },
        success_url: `${process.env.AUTH_URL}/dashboard/buyer/purchaseUnit?status=success`,
        cancel_url: `${process.env.AUTH_URL}/dashboard/buyer/purchaseUnit?status=canceled`,
        customer_email: userSession.user.email,
        metadata: {
          units: units.toString(),
          userId: userSession.user.id,
          sellerId: sellerId,
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
