/**
 * Subscription Cancellation API
 * Handles subscription cancellation with feedback collection for churn analytics
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  badRequest,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";
import {
  cancelSubscriptionWithFeedback,
  reactivateSubscription,
  getSubscriptionDetails,
} from "@/lib/stripeSubscriptionService";
import {
  CANCELLATION_REASONS,
  CancellationReason,
} from "@/models/cancellationFeedback";
import connectDB from "@/lib/connectdb";
import { User } from "@/models/userModel";

type StripeSubscriptionLike = {
  status?: string;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
};

/**
 * GET /api/subscriptions/cancel
 * Get cancellation status and available options
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    await connectDB();

    const user = await User.findById(session.user.id).select("subscription");

    if (!user) {
      return notFound("User");
    }

    const subscription = user.subscription;
    const hasActiveSubscription = subscription?.isSubscriptionActive;
    const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd;

    // Get live Stripe subscription details if available
    let stripeDetails = null;
    if (subscription?.stripeSubscriptionId) {
      const result = await getSubscriptionDetails(session.user.id);
      if (result.success) {
        const sub = result.subscription as StripeSubscriptionLike | undefined;
        if (sub) {
          stripeDetails = {
            status: sub.status,
            currentPeriodEnd: sub.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : null,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      cancellationStatus: {
        hasActiveSubscription,
        cancelAtPeriodEnd,
        canceledAt: subscription?.canceledAt,
        accessEndsAt: subscription?.subscriptionExpiryDate,
        canCancel: hasActiveSubscription && !cancelAtPeriodEnd,
        canReactivate: hasActiveSubscription && cancelAtPeriodEnd,
        stripeDetails,
      },
      availableReasons: CANCELLATION_REASONS,
    });
  } catch (error) {
    console.error("[CancelAPI] GET error:", error);
    return internalError("Failed to get cancellation status");
  }
}

/**
 * POST /api/subscriptions/cancel
 * Cancel subscription with optional feedback
 *
 * Request body:
 * {
 *   reason?: CancellationReason,  // Pre-defined reason
 *   feedbackText?: string,        // Optional free-text feedback
 *   cancelAt?: "now" | "period_end"  // When to cancel (default: period_end)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    const body = await request.json();
    const {
      reason,
      feedbackText,
      cancelAt = "period_end",
    } = body as {
      reason?: CancellationReason;
      feedbackText?: string;
      cancelAt?: "now" | "period_end";
    };

    // Validate reason if provided
    if (reason && !CANCELLATION_REASONS.includes(reason)) {
      return badRequest(
        `Invalid cancellation reason. Must be one of: ${CANCELLATION_REASONS.join(", ")}`,
      );
    }

    // Validate cancelAt
    if (cancelAt !== "now" && cancelAt !== "period_end") {
      return badRequest("cancelAt must be 'now' or 'period_end'");
    }

    const cancelImmediately = cancelAt === "now";

    const result = await cancelSubscriptionWithFeedback(session.user.id, {
      cancelImmediately,
      reason,
      feedbackText,
    });

    if (!result.success) {
      return badRequest(result.message || "Failed to cancel subscription");
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      accessEndsAt: result.accessEndsAt,
      feedbackRecorded: result.feedbackRecorded,
      status: result.status,
    });
  } catch (error) {
    console.error("[CancelAPI] POST error:", error);
    return internalError("Failed to cancel subscription");
  }
}

/**
 * PUT /api/subscriptions/cancel
 * Reactivate a subscription that was scheduled to cancel
 */
export async function PUT() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    const result = await reactivateSubscription(session.user.id);

    if (!result.success) {
      return badRequest(result.message || "Failed to reactivate subscription");
    }

    return NextResponse.json({
      success: true,
      message: "Subscription reactivated successfully",
      status: result.status,
    });
  } catch (error) {
    console.error("[CancelAPI] PUT error:", error);
    return internalError("Failed to reactivate subscription");
  }
}
