import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import Subscription from "@/models/appSubscription";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const {
      buyerId,
      planType,
    }: { buyerId: string; planType: "Basic" | "Premium" } = await req.json();

    const plans = {
      Basic: { leadsRemaining: 10, price: 50 },
      Premium: { leadsRemaining: 30, price: 120 },
    };

    if (!plans[planType])
      return new NextResponse(JSON.stringify({ error: "Invalid plan" }), {
        status: 400,
      });

    const newSubscription = new Subscription({
      buyerId,
      planType,
      leadsRemaining: plans[planType].leadsRemaining,
      nextBillingDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    });

    await newSubscription.save();

    return new NextResponse(
      JSON.stringify({ success: true, subscription: newSubscription }),
      { status: 200 }
    );
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ error: "Subscription creation failed" }),
      { status: 500 }
    );
  }
}
