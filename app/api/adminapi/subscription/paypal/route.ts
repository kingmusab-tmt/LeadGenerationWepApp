import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { User } from "@/models/user";
import paypal from "@paypal/checkout-server-sdk";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderID, plan } = await req.json();

  try {
    // Verify PayPal order
    const paypalClient = new paypal.core.PayPalHttpClient(
      new paypal.core.LiveEnvironment(
        process.env.PAYPAL_CLIENT_ID!,
        process.env.PAYPAL_SECRET!
      )
    );

    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    const response = await paypalClient.execute(request);

    if (response.statusCode !== 201) {
      throw new Error("PayPal order capture failed");
    }

    // Update user subscription
    await User.updateOne(
      { email: session.user.email },
      {
        $set: {
          subscription: {
            plan,
            status: "active",
            startDate: new Date(),
            paymentMethod: "paypal",
            paymentId: orderID,
            limits: getPlanLimits(plan),
            usage: { leads: 0, callSeconds: 0 },
          },
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error completing PayPal subscription:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function getPlanLimits(plan: string) {
  // Same implementation as before
}
