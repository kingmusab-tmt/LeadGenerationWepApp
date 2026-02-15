/**
 * Subscription Management API
 * Handles cancel, reactivate, change plan, and billing portal access
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  cancelSubscriptionWithFeedback,
  reactivateSubscription,
  changeSubscriptionPlan,
  createBillingPortalSession,
  getSubscriptionDetails,
  getProrationPreview,
  getPaymentMethods,
} from "@/lib/stripeSubscriptionService";
import { Tier } from "@/models/tier";
import {
  CancellationReason,
  CANCELLATION_REASONS,
} from "@/models/cancellationFeedback";
import connectDB from "@/lib/connectdb";
import { User } from "@/models/userModel";

/**
 * GET /api/subscriptions/manage
 * Get comprehensive subscription details including usage, limits, payment method
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id).select(
      "subscription stripeCustomerId",
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    // Get live subscription details from Stripe
    let stripeSubscription = null;
    let renewalAmount: number | null = null;
    let renewalCurrency = "usd";
    let defaultPaymentMethod: {
      brand?: string;
      last4?: string;
      expMonth?: number;
      expYear?: number;
    } | null = null;

    if (user.subscription?.stripeSubscriptionId) {
      const result = await getSubscriptionDetails(session.user.id);
      if (result.success && result.subscription) {
        stripeSubscription = result.subscription;

        // Extract renewal amount from subscription items (as fallback only)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = result.subscription as any;
        const items = sub.items?.data || [];
        if (items.length > 0) {
          const stripeAmount = items.reduce(
            (sum: number, item: { price?: { unit_amount?: number } }) =>
              sum + (item.price?.unit_amount || 0),
            0,
          );
          renewalCurrency = items[0]?.price?.currency || "usd";
          // Only use Stripe amount if we don't have better data from database
          if (!user.subscription?.subscriptionRenewalPrice) {
            renewalAmount = stripeAmount;
          }
        }

        // Extract default payment method if expanded
        const pm = sub.default_payment_method;
        if (pm && typeof pm === "object") {
          defaultPaymentMethod = {
            brand: pm.card?.brand,
            last4: pm.card?.last4,
            expMonth: pm.card?.exp_month,
            expYear: pm.card?.exp_year,
          };
        }
      }
    }

    // Priority 1: Use subscriptionRenewalPrice from database (set during checkout)
    if (user.subscription?.subscriptionRenewalPrice) {
      renewalAmount = user.subscription.subscriptionRenewalPrice;
    }
    // Priority 2: Fallback to tier's renewalPrice if available
    else if (user.subscription?.subscriptionTierId) {
      const tier = await Tier.findById(
        user.subscription.subscriptionTierId,
      ).lean();
      if (tier && tier.renewalPrice) {
        renewalAmount = parseFloat(tier.renewalPrice);
      }
    }
    // Priority 3: Fall back to subscription price from database
    if (renewalAmount === null && user.subscription?.subscriptionPrice) {
      renewalAmount = user.subscription.subscriptionPrice;
    }

    // Adjust renewal amount based on billing interval
    // renewalPrice is stored as a yearly price, but monthly subscribers should see monthly price
    if (
      renewalAmount !== null &&
      user.subscription?.billingInterval === "month"
    ) {
      renewalAmount = renewalAmount / 12;
    }

    // If no payment method from subscription, try to get from customer
    if (!defaultPaymentMethod && user.stripeCustomerId) {
      const pmResult = await getPaymentMethods(session.user.id);
      if (pmResult.success && pmResult.paymentMethods) {
        // Get the first payment method (sorted by default)
        if (pmResult.paymentMethods.length > 0) {
          const paymentMethod = pmResult.paymentMethods[0];
          defaultPaymentMethod = {
            brand: paymentMethod.brand,
            last4: paymentMethod.last4,
            expMonth: paymentMethod.expMonth,
            expYear: paymentMethod.expYear,
          };
        }
      }
    }

    // Get tier details for tier name and features
    let tierDetails = null;
    if (user.subscription?.subscriptionTierId) {
      const tier = await Tier.findById(
        user.subscription.subscriptionTierId,
      ).lean();
      if (tier) {
        tierDetails = {
          name: tier.name,
          description: tier.description,
          features: tier.features || [],
        };
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = stripeSubscription as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscriptionData =
      (user.subscription as any)?.toObject?.() || user.subscription;

    return NextResponse.json({
      success: true,
      subscription: {
        ...subscriptionData,
        stripeDetails: sub
          ? {
              id: sub.id,
              status: sub.status,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
              cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
            }
          : null,
        renewalAmount: renewalAmount ? renewalAmount : null, // Convert from cents
        renewalCurrency,
        defaultPaymentMethod,
        tierDetails,
      },
    });
  } catch (error) {
    console.error("[SubscriptionManageAPI] GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to get subscription details" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/subscriptions/manage
 * Handle subscription actions: cancel, reactivate, change-plan, billing-portal
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { action, ...params } = body;

    await connectDB();

    switch (action) {
      case "cancel": {
        const {
          cancelImmediately = false,
          reason,
          feedbackText,
        } = params as {
          cancelImmediately?: boolean;
          reason?: CancellationReason;
          feedbackText?: string;
        };

        // Validate reason if provided
        if (reason && !CANCELLATION_REASONS.includes(reason)) {
          return NextResponse.json(
            { success: false, message: "Invalid cancellation reason" },
            { status: 400 },
          );
        }

        const result = await cancelSubscriptionWithFeedback(session.user.id, {
          cancelImmediately,
          reason,
          feedbackText,
        });

        if (!result.success) {
          return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message: result.message,
          cancelAtPeriodEnd: !cancelImmediately,
          accessEndsAt: result.accessEndsAt,
          feedbackRecorded: result.feedbackRecorded,
        });
      }

      case "reactivate": {
        const result = await reactivateSubscription(session.user.id);

        if (!result.success) {
          return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message: "Subscription reactivated successfully",
        });
      }

      case "change-plan": {
        const { newTierId, billingInterval } = params;

        if (!newTierId) {
          return NextResponse.json(
            { success: false, message: "New tier ID is required" },
            { status: 400 },
          );
        }

        const result = await changeSubscriptionPlan(
          session.user.id,
          newTierId,
          billingInterval || "month",
        );

        if (!result.success) {
          return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message: "Subscription plan updated successfully",
          subscriptionId: result.subscriptionId,
        });
      }

      case "billing-portal": {
        const { returnUrl } = params;

        if (!returnUrl) {
          return NextResponse.json(
            { success: false, message: "Return URL is required" },
            { status: 400 },
          );
        }

        const result = await createBillingPortalSession(
          session.user.id,
          returnUrl,
        );

        if (!result.success) {
          return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          portalUrl: result.url,
        });
      }

      case "preview-plan": {
        const { newTierId, billingInterval, isTrialConversion } = params;

        if (!newTierId) {
          return NextResponse.json(
            { success: false, message: "New tier ID is required" },
            { status: 400 },
          );
        }

        const result = await getProrationPreview(
          session.user.id,
          newTierId,
          billingInterval || "month",
          isTrialConversion || false,
        );

        if (!result.success) {
          return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          preview: result.preview,
        });
      }

      default:
        return NextResponse.json(
          { success: false, message: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[SubscriptionManageAPI] POST error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process subscription action" },
      { status: 500 },
    );
  }
}
