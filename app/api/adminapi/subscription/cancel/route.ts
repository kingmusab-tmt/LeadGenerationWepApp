import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { User } from "@/models/user";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await User.findOne({ email: session.user.email });

  if (!user?.subscription?.paymentId) {
    return NextResponse.json(
      {
        error: "No active subscription found",
      },
      { status: 400 }
    );
  }

  try {
    if (user.subscription.paymentMethod === "stripe") {
      await stripe.subscriptions.update(user.subscription.paymentId, {
        cancel_at_period_end: true,
      });
    }

    // For PayPal, you would need to implement the cancellation logic
    // This is just a placeholder
    if (user.subscription.paymentMethod === "paypal") {
      // Implement PayPal subscription cancellation
    }

    await User.updateOne(
      { email: session.user.email },
      {
        $set: {
          "subscription.status": "canceled",
          "subscription.endDate": new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Subscription will be canceled at the end of the billing period",
    });
  } catch (err: any) {
    console.error("Error canceling subscription:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
