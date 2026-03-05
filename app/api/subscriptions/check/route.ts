import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { successResponse, internalError } from "@/lib/api/error-handler";

/**
 * GET /api/subscriptions/check
 * Check if user's subscription is active
 */
export async function GET() {
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

    // Determine if subscription is active based on multiple factors
    let isSubscriptionActive = false;
    let daysRemaining = 0;

    if (
      subscription?.isSubscriptionActive === true &&
      subscription?.subscriptionExpiryDate
    ) {
      // Check if subscription expiry date is in the future
      const expiryDate = new Date(subscription.subscriptionExpiryDate);
      if (expiryDate > currentDate) {
        isSubscriptionActive = true;
        // Calculate days remaining
        const timeDiff = expiryDate.getTime() - currentDate.getTime();
        daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
      } else {
        // Subscription has expired, update the user's subscription status
        isSubscriptionActive = false;

        // Update subscription status in the database
        await User.findByIdAndUpdate(session.user.id, {
          "subscription.isSubscriptionActive": false,
        });
      }
    }

    const isTrial = subscription?.isTrial === true;
    const isTrialExpired =
      isTrial && !isSubscriptionActive && subscription?.usedTrial === true;

    return successResponse({
      isActive: isSubscriptionActive,
      expiryDate: subscription?.subscriptionExpiryDate || null,
      usedTrial: subscription?.usedTrial || false,
      isTrial,
      isTrialExpired,
      daysRemaining,
      planName: subscription?.subscriptionPlan || null,
      tierType: subscription?.subscriptionTierType || null,
    });
  } catch (error) {
    console.error("[GET /api/subscriptions/check]", error);
    return internalError("Failed to check subscription");
  }
}
