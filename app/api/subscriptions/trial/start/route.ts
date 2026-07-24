import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import {
  successResponse,
  unauthorized,
  forbidden,
  conflict,
  notFound,
  internalError,
} from "@/lib/api/error-handler";
import {
  invalidateSessionCache,
  invalidateAllUserSessions,
} from "@/lib/cachedSession";
import {
  TIER_LIMIT_PRESETS,
  buildSubscriptionLimitsFromTier,
} from "@/lib/subscriptionLimitsService";
import { requireCsrf } from "@/lib/security/requireCsrf";

// Trial configuration
const TRIAL_DURATION_DAYS = 14;
const TRIAL_PLAN_NAME = "14-Day Free Trial";
const SUBSCRIPTION_ROLES = ["seller", "business-admin", "admin"];

/**
 * POST /api/subscriptions/trial/start
 * Start a 14-day free trial for the user
 * Provides professional-tier features for testing
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    if (!SUBSCRIPTION_ROLES.includes(session.user.role || "")) {
      return forbidden("Seller access required");
    }

    const csrfError = requireCsrf(req, session.user.email);
    if (csrfError) return csrfError;

    await dbConnect();

    // Get the current user to check existing subscription status
    const currentUser = await User.findById(session.user.id).select(
      "subscription role",
    );
    if (!currentUser) {
      return notFound("User not found");
    }

    // Check if user has already used trial
    if (currentUser.subscription?.usedTrial === true) {
      return conflict(
        "You have already used your free trial. Please choose a paid subscription to continue.",
      );
    }

    // Check if user already has an active paid subscription
    if (
      currentUser.subscription?.isSubscriptionActive === true &&
      currentUser.subscription?.subscriptionTierType === "paid"
    ) {
      return conflict(
        "You already have an active paid subscription. No trial needed.",
      );
    }

    // Calculate trial dates
    const startDate = new Date();
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + TRIAL_DURATION_DAYS);

    // Use complete professional tier limits/features for trial
    const trialLimits = buildSubscriptionLimitsFromTier(
      TIER_LIMIT_PRESETS.professional,
    );

    // Prepare trial subscription update
    const subscriptionUpdate = {
      "subscription.subscriptionPlan": TRIAL_PLAN_NAME,
      "subscription.subscriptionStartDate": startDate,
      "subscription.subscriptionExpiryDate": expiryDate,
      "subscription.isSubscriptionActive": true,
      "subscription.isTrial": true,
      "subscription.usedTrial": true,
      "subscription.subscriptionPaymentMethod": "free",
      "subscription.subscriptionTierId": null, // No tier - it's a trial
      "subscription.subscriptionTierType": "free",
      "subscription.subscriptionTierUserType": "seller",
      "subscription.subscriptionPrice": 0,
      "subscription.subscriptionLimits": trialLimits,
      "subscription.subscriptionUsage": {
        leads: 0,
        callSeconds: 0,
        forms: 0,
        buyers: 0,
        emailCampaigns: 0,
        smsCampaigns: 0,
        workflowExecutions: 0,
        invoices: 0,
        activeSessions: 0,
        teamMembersCount: 0,
        usagePeriodStart: startDate,
        usagePeriodEnd: expiryDate,
      },
    };

    // Update user's subscription
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { $set: subscriptionUpdate },
      { new: true },
    ).select("subscription role");

    if (!updatedUser) {
      return notFound("User not found after update");
    }

    // Invalidate session cache so the new subscription is fetched on next request
    await invalidateSessionCache(session.user.email);
    await invalidateAllUserSessions(session.user.id);

    return successResponse({
      success: true,
      message: `Your ${TRIAL_DURATION_DAYS}-day free trial has started!`,
      trial: {
        startDate,
        expiryDate,
        daysRemaining: TRIAL_DURATION_DAYS,
        planName: TRIAL_PLAN_NAME,
      },
      subscription: updatedUser.subscription,
    });
  } catch (error) {
    console.error("[POST /api/subscriptions/trial/start]", error);
    return internalError("Failed to start trial");
  }
}

/**
 * GET /api/subscriptions/trial/start
 * Check trial eligibility without starting
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    if (!SUBSCRIPTION_ROLES.includes(session.user.role || "")) {
      return forbidden("Seller access required");
    }

    await dbConnect();

    const user = await User.findById(session.user.id).select("subscription");

    if (!user) {
      return notFound("User not found");
    }

    const usedTrial = user.subscription?.usedTrial === true;
    const isCurrentlyOnTrial = user.subscription?.isTrial === true;
    const isSubActive = user.subscription?.isSubscriptionActive === true;

    let daysRemaining = 0;
    if (
      isCurrentlyOnTrial &&
      isSubActive &&
      user.subscription?.subscriptionExpiryDate
    ) {
      const expiry = new Date(user.subscription.subscriptionExpiryDate);
      const today = new Date();
      const timeDiff = expiry.getTime() - today.getTime();
      daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    }

    return successResponse({
      eligible: !usedTrial,
      usedTrial,
      isCurrentlyOnTrial,
      isSubActive,
      daysRemaining,
      trialDurationDays: TRIAL_DURATION_DAYS,
      message: usedTrial
        ? "You have already used your free trial."
        : "You are eligible for a 14-day free trial.",
    });
  } catch (error) {
    console.error("[GET /api/subscriptions/trial/start]", error);
    return internalError("Failed to check trial eligibility");
  }
}
