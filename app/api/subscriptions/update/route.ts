// app/api/subscriptions/update/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/user";
import { Tier } from "@/models/tier";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      tierId,
      planName,
      price,
      tierType,
      subscriptionYears = 1, // Default to 1 year if not provided
    } = body;

    // Validate required fields
    if (!tierId || !planName || !tierType || (tierType !== "free" && !price)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate subscription years for paid tiers
    if (
      tierType !== "free" &&
      (isNaN(subscriptionYears) || subscriptionYears < 1)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid subscription duration. Must be at least 1 year for paid tiers.",
        },
        { status: 400 }
      );
    }

    // Get the tier details to access the limits
    const tier = await Tier.findById(tierId);
    if (!tier) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }

    // Calculate subscription dates
    const startDate = new Date();
    let expiryDate = new Date(startDate);

    if (tierType === "free") {
      // Free tier expires in 1 month
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else {
      // Paid tiers expire after X years
      expiryDate.setFullYear(expiryDate.getFullYear() + subscriptionYears);
    }

    // Prepare subscription update data with tier limits
    const subscriptionUpdate = {
      "subscription.subscriptionPlan": planName,
      "subscription.subscriptionStartDate": startDate,
      "subscription.subscriptionExpiryDate": expiryDate,
      "subscription.isSubscriptionActive": true,
      "subscription.isTrial": tierType === "free" ? true : false,
      "subscription.subscriptionPaymentMethod": "free",
      "subscription.subscriptionTierId": tierId,
      "subscription.subscriptionTierType":
        tierType === "free" ? "free" : "paid",
      "subscription.subscriptionPrice": price,
      "subscription.subscriptionTierUserType": tier.tierUserType || "seller",
      "subscription.subscriptionLimits": {
        leads: tier.tierLimits?.leads || 0,
        twilioNumbers: tier.tierLimits?.twilioNumbers || 0,
        numbers: tier.tierLimits?.numbers || 0,
        callSeconds: tier.tierLimits?.callSeconds || 0,
        forms: tier.tierLimits?.forms || 0,
        buyers: tier.tierLimits?.buyers || 0,
        exports: tier.tierLimits?.exports || false,
        imports: tier.tierLimits?.imports || false,
        liveSupport: tier.tierLimits?.liveSupport || false,
        industries: tier.tierLimits?.industries || 0,
      },
      "subscription.subscriptionUsage": {
        leads: 0, // Reset usage counters
        callSeconds: 0,
      },
    };

    // Update user's subscription
    const updatedUser = await User.findOneAndUpdate(
      { _id: session.user.id },
      { $set: subscriptionUpdate },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      subscription: updatedUser.subscription,
    });
  } catch (error) {
    console.error("[SUBSCRIPTION_UPDATE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
