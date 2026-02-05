import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import {
  successResponse,
  unauthorized,
  internalError,
} from "@/lib/api/error-handler";

/**
 * GET /api/subscriptions/check
 * Check if user's subscription is active
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return successResponse({ isActive: false, expiryDate: null });
    }

    await dbConnect();

    // Find user and check subscription status
    const user = await User.findById(session.user.id).select("subscription");

    if (!user) {
      return successResponse({ isActive: false, expiryDate: null });
    }

    // Check if user has an active subscription
    const currentDate = new Date();
    const subscription = user.subscription;

    console.log("[Subscriptions/Check] User subscription data:", {
      userId: session.user.id,
      email: session.user.email,
      isSubscriptionActive: subscription?.isSubscriptionActive,
      subscriptionExpiryDate: subscription?.subscriptionExpiryDate,
      currentDate: currentDate.toISOString(),
    });

    // Determine if subscription is active based on multiple factors
    let isSubscriptionActive = false;

    if (
      subscription?.isSubscriptionActive === true &&
      subscription?.subscriptionExpiryDate
    ) {
      // Check if subscription expiry date is in the future
      const expiryDate = new Date(subscription.subscriptionExpiryDate);
      if (expiryDate > currentDate) {
        isSubscriptionActive = true;
        console.log("[Subscriptions/Check] Subscription is ACTIVE");
      } else {
        // Subscription has expired, update the user's subscription status
        isSubscriptionActive = false;
        console.log("[Subscriptions/Check] Subscription has EXPIRED");

        // Update subscription status in the database
        await User.findByIdAndUpdate(session.user.id, {
          "subscription.isSubscriptionActive": false,
        });
      }
    }

    console.log("[Subscriptions/Check] Final response:", {
      isActive: isSubscriptionActive,
      expiryDate: subscription?.subscriptionExpiryDate || null,
    });

    return successResponse({
      isActive: isSubscriptionActive,
      expiryDate: subscription?.subscriptionExpiryDate || null,
      usedTrial: subscription?.usedTrial || false,
    });
  } catch (error) {
    console.error("[GET /api/subscriptions/check]", error);
    return internalError("Failed to check subscription");
  }
}
