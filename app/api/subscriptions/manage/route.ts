/**
 * Subscription Management API
 * Handles cancel, reactivate, change plan, and billing portal access
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";
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
import { requireCsrf } from "@/lib/security/requireCsrf";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";

// Subscription management is only meaningful for seller-type accounts —
// business-admin accounts use this same seller dashboard/settings surface,
// and admin needs override access for support. Everything else (buyer,
// user, staff) has no business mutating a subscription document.
const SUBSCRIPTION_ROLES = ["seller", "business-admin", "admin"];

type StripeSubscriptionLike = {
  id?: string;
  status?: string;
  current_period_end?: number;
  current_period_start?: number;
  cancel_at_period_end?: boolean;
  cancel_at?: number | null;
  default_payment_method?: {
    card?: {
      brand?: string;
      last4?: string;
      exp_month?: number;
      exp_year?: number;
    };
  } | null;
  items?: {
    data?: Array<{ price?: { unit_amount?: number; currency?: string } }>;
  };
};

/**
 * GET /api/subscriptions/manage
 * Get comprehensive subscription details including usage, limits, payment method
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    if (!SUBSCRIPTION_ROLES.includes(session.user.role || "")) {
      return forbidden("Seller access required");
    }

    await connectDB();

    const user = await User.findById(session.user.id).select(
      "subscription stripeCustomerId",
    );

    if (!user) {
      return notFound("User");
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

    // Fetch the subscription's tier once and reuse it below — it was
    // previously looked up twice (once for the renewal-price fallback,
    // once for tierDetails) in the same request.
    const tierDoc = user.subscription?.subscriptionTierId
      ? await Tier.findById(user.subscription.subscriptionTierId).lean()
      : null;

    // Priority 1: Use subscriptionRenewalPrice from database (set during
    // checkout/renewal as tier.renewalPrice × durationMonths, so it's
    // already the correct total for whatever billing interval is active —
    // no further scaling needed here).
    if (user.subscription?.subscriptionRenewalPrice) {
      renewalAmount = user.subscription.subscriptionRenewalPrice;
    }
    // Priority 2: Fallback to tier's renewalPrice if available. Unlike
    // subscriptionRenewalPrice, tier.renewalPrice is the raw monthly rate,
    // so annual billers need it scaled by 12 to match the same convention.
    else if (tierDoc && tierDoc.renewalPrice) {
      const monthlyRate = parseFloat(tierDoc.renewalPrice);
      renewalAmount =
        user.subscription?.billingInterval === "year"
          ? monthlyRate * 12
          : monthlyRate;
    }
    // Priority 3: Fall back to subscription price from database (also
    // already stored as the correct total for the active billing interval).
    if (renewalAmount === null && user.subscription?.subscriptionPrice) {
      renewalAmount = user.subscription.subscriptionPrice;
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
    const tierDetails = tierDoc
      ? {
          name: tierDoc.name,
          description: tierDoc.description,
          features: tierDoc.features || [],
        }
      : null;

    const sub = stripeSubscription as StripeSubscriptionLike | null;
    const subscriptionRaw = user.subscription as unknown;
    const subscriptionData: Record<string, unknown> =
      subscriptionRaw && typeof subscriptionRaw === "object"
        ? "toObject" in subscriptionRaw &&
          typeof (subscriptionRaw as { toObject?: unknown }).toObject ===
            "function"
          ? (
              subscriptionRaw as { toObject: () => Record<string, unknown> }
            ).toObject()
          : (subscriptionRaw as Record<string, unknown>)
        : {};

    return NextResponse.json({
      success: true,
      subscription: {
        ...subscriptionData,
        stripeDetails: sub
          ? {
              id: sub.id,
              status: sub.status,
              currentPeriodEnd: sub.current_period_end
                ? new Date(sub.current_period_end * 1000)
                : null,
              currentPeriodStart: sub.current_period_start
                ? new Date(sub.current_period_start * 1000)
                : null,
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
    return internalError("Failed to get subscription details");
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
      return unauthorized("Authentication required");
    }

    if (!SUBSCRIPTION_ROLES.includes(session.user.role || "")) {
      return forbidden("Seller access required");
    }

    const csrfError = requireCsrf(request, session.user.email);
    if (csrfError) return csrfError;

    const rateLimited = await checkSimpleRateLimit(request, {
      scope: "subscriptions-manage",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      actorId: session.user.id,
    });
    if (rateLimited) return rateLimited;

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
          return badRequest("Invalid cancellation reason");
        }

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
          cancelAtPeriodEnd: !cancelImmediately,
          accessEndsAt: result.accessEndsAt,
          feedbackRecorded: result.feedbackRecorded,
        });
      }

      case "reactivate": {
        const result = await reactivateSubscription(session.user.id);

        if (!result.success) {
          return badRequest(
            result.message || "Failed to reactivate subscription",
          );
        }

        return NextResponse.json({
          success: true,
          message: "Subscription reactivated successfully",
        });
      }

      case "change-plan": {
        const { newTierId, billingInterval } = params;

        if (!newTierId) {
          return badRequest("New tier ID is required");
        }

        const result = await changeSubscriptionPlan(
          session.user.id,
          newTierId,
          billingInterval || "month",
        );

        if (!result.success) {
          return badRequest(
            result.message || "Failed to change subscription plan",
          );
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
          return badRequest("Return URL is required");
        }

        const result = await createBillingPortalSession(
          session.user.id,
          returnUrl,
        );

        if (!result.success) {
          return badRequest(
            result.message || "Failed to create billing portal session",
          );
        }

        return NextResponse.json({
          success: true,
          portalUrl: result.url,
        });
      }

      case "preview-plan": {
        const { newTierId, billingInterval, isTrialConversion } = params;

        if (!newTierId) {
          return badRequest("New tier ID is required");
        }

        const result = await getProrationPreview(
          session.user.id,
          newTierId,
          billingInterval || "month",
          isTrialConversion || false,
        );

        if (!result.success) {
          return badRequest(
            result.message || "Failed to generate proration preview",
          );
        }

        return NextResponse.json({
          success: true,
          preview: result.preview,
        });
      }

      default:
        return badRequest(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("[SubscriptionManageAPI] POST error:", error);
    return internalError("Failed to process subscription action");
  }
}
