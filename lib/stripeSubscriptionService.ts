/**
 * Stripe Subscription Service
 * Handles recurring billing, customer management, and subscription lifecycle
 */

import Stripe from "stripe";
import { User, IUser } from "@/models";
import { Tier, ITier } from "@/models/tier";
import {
  CancellationFeedback,
  CancellationReason,
} from "@/models/cancellationFeedback";
import dbConnect from "@/lib/connectdb";
import {
  forceRefreshUserSession,
  invalidateSessionWithConfirmation,
} from "@/lib/cachedSession";
import {
  validateTierPrice,
  getCouponForTierDiscount,
  syncTierPricesWithStripe,
} from "@/lib/priceSyncService";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

// Types for subscription management
export interface SubscriptionResult {
  success: boolean;
  message: string;
  subscriptionId?: string;
  clientSecret?: string;
  customerId?: string;
  status?: Stripe.Subscription.Status;
}

export interface CustomerResult {
  success: boolean;
  customerId?: string;
  message?: string;
}

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(
  userId: string,
): Promise<CustomerResult> {
  await dbConnect();

  const user = await User.findById(userId);
  if (!user) {
    return { success: false, message: "User not found" };
  }

  // Return existing customer ID if available
  if (user.stripeCustomerId) {
    // Verify customer still exists in Stripe
    try {
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      if (!customer.deleted) {
        return { success: true, customerId: user.stripeCustomerId };
      }
    } catch (error) {
      // Customer doesn't exist, create new one
      console.log(
        "[StripeSubscription] Customer not found in Stripe, creating new one",
      );
    }
  }

  // Create new Stripe customer
  try {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: {
        userId: userId,
        role: user.role,
      },
    });

    // Save customer ID to user
    await User.findByIdAndUpdate(userId, {
      stripeCustomerId: customer.id,
    });

    return { success: true, customerId: customer.id };
  } catch (error: any) {
    console.error("[StripeSubscription] Failed to create customer:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Create a Stripe checkout session for a recurring subscription
 */
export async function createSubscriptionCheckout(
  userId: string,
  tierId: string,
  billingInterval: "month" | "year" = "month",
  successUrl: string,
  cancelUrl: string,
): Promise<{
  success: boolean;
  sessionId?: string;
  sessionUrl?: string;
  message?: string;
}> {
  await dbConnect();

  const [user, tier] = await Promise.all([
    User.findById(userId),
    Tier.findById(tierId),
  ]);

  if (!user) {
    return { success: false, message: "User not found" };
  }

  if (!tier) {
    return { success: false, message: "Tier not found" };
  }

  if (tier.tierType === "free") {
    return {
      success: false,
      message: "Cannot create subscription for free tier",
    };
  }

  // Get or create Stripe customer
  const customerResult = await getOrCreateStripeCustomer(userId);
  if (!customerResult.success || !customerResult.customerId) {
    return {
      success: false,
      message: customerResult.message || "Failed to create customer",
    };
  }

  // Get the appropriate Stripe Price ID
  let stripePriceId: string | undefined;

  if (billingInterval === "year") {
    stripePriceId = tier.stripeAnnualPriceId || tier.stripePriceId;
  } else {
    stripePriceId = tier.stripeMonthlyPriceId || tier.stripePriceId;
  }

  // Validate price sync before checkout
  if (stripePriceId) {
    const priceValidation = await validateTierPrice(tierId, billingInterval);
    if (!priceValidation.valid && priceValidation.stripePrice !== null) {
      console.warn(
        `[StripeSubscription] Price mismatch for tier ${tier.name}: ${priceValidation.message}`,
      );
      // Log warning but continue - Stripe price is authoritative
    } else if (!priceValidation.valid && priceValidation.stripePrice === null) {
      console.warn(
        `[StripeSubscription] Invalid Stripe price ID for tier ${tier.name}, attempting price sync repair`,
      );

      const syncResult = await syncTierPricesWithStripe(tierId);
      if (syncResult.success) {
        const repairedPriceId =
          billingInterval === "year"
            ? syncResult.annualPriceId
            : syncResult.monthlyPriceId;

        if (repairedPriceId) {
          stripePriceId = repairedPriceId;
          console.log(
            `[StripeSubscription] Repaired Stripe price ID for tier ${tier.name}: ${repairedPriceId}`,
          );
        } else {
          stripePriceId = undefined;
          console.warn(
            `[StripeSubscription] Price sync completed without a usable price ID for tier ${tier.name}, falling back to dynamic pricing`,
          );
        }
      } else {
        stripePriceId = undefined;
        console.warn(
          `[StripeSubscription] Price sync repair failed for tier ${tier.name}: ${syncResult.errors.join("; ")}. Falling back to dynamic pricing`,
        );
      }
    }
  }

  // Get Stripe coupon for tier discount (replaces local discountedPrice)
  let couponId: string | null = null;
  if (tier.discountPercentage && tier.discountPercentage > 0) {
    couponId = await getCouponForTierDiscount(tierId);
    if (couponId) {
      console.log(
        `[StripeSubscription] Applying ${tier.discountPercentage}% discount coupon: ${couponId}`,
      );
    }
  }

  // If no Stripe Price ID exists, create dynamic price
  let priceData: Stripe.Checkout.SessionCreateParams.LineItem | undefined;

  if (stripePriceId) {
    priceData = {
      price: stripePriceId,
      quantity: 1,
    };
  } else {
    // Create dynamic recurring price using BASE price (discounts applied via coupon)
    const unitAmount =
      billingInterval === "year"
        ? Math.round(parseFloat(tier.annualPrice || tier.price) * 100)
        : Math.round(parseFloat(tier.price) * 100);

    priceData = {
      price_data: {
        currency: "usd",
        product_data: {
          name: `${tier.name} Subscription`,
          description: tier.description,
          metadata: {
            tierId: tierId,
            tierName: tier.name,
          },
        },
        unit_amount: unitAmount,
        recurring: {
          interval: billingInterval,
          interval_count: 1,
        },
      },
      quantity: 1,
    };
  }

  try {
    // Calculate duration in months for subscription
    const durationMonths = billingInterval === "year" ? 12 : 1;

    // Build checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerResult.customerId,
      payment_method_types: ["card"],
      line_items: [priceData],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        tierId,
        userId,
        billingInterval,
        durationMonths: durationMonths.toString(),
        purchaseType: "subscription",
        ...(couponId && { appliedCoupon: couponId }),
      },
      subscription_data: {
        metadata: {
          tierId,
          userId,
          billingInterval,
          durationMonths: durationMonths.toString(),
          ...(couponId && { appliedCoupon: couponId }),
        },
      },
      // Collect billing address
      billing_address_collection: "auto",
    };

    // Apply tier discount coupon (takes precedence over promotion codes)
    if (couponId) {
      sessionParams.discounts = [{ coupon: couponId }];
    } else {
      // Allow manual promotion codes if no tier discount
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      success: true,
      sessionId: session.id,
      sessionUrl: session.url || undefined,
    };
  } catch (error: any) {
    console.error(
      "[StripeSubscription] Failed to create checkout session:",
      error,
    );
    return { success: false, message: error.message };
  }
}

/**
 * Cancel a Stripe subscription
 */
export async function cancelSubscription(
  userId: string,
  cancelImmediately: boolean = false,
): Promise<SubscriptionResult> {
  await dbConnect();

  const user = await User.findById(userId);
  if (!user) {
    return { success: false, message: "User not found" };
  }

  const stripeSubscriptionId = user.subscription?.stripeSubscriptionId;
  if (!stripeSubscriptionId) {
    return { success: false, message: "No active subscription found" };
  }

  try {
    let subscription: Stripe.Subscription;

    if (cancelImmediately) {
      // Cancel immediately
      subscription = await stripe.subscriptions.cancel(stripeSubscriptionId);
    } else {
      // Cancel at period end (keeps access until expiry)
      subscription = await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    // Update user subscription status
    await User.findByIdAndUpdate(userId, {
      "subscription.cancelAtPeriodEnd": !cancelImmediately,
      "subscription.canceledAt": cancelImmediately ? new Date() : null,
    });

    return {
      success: true,
      message: cancelImmediately
        ? "Subscription canceled immediately"
        : "Subscription will cancel at the end of the billing period",
      subscriptionId: stripeSubscriptionId,
      status: subscription.status,
    };
  } catch (error: any) {
    console.error("[StripeSubscription] Failed to cancel subscription:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Reactivate a canceled subscription (if not yet expired)
 */
export async function reactivateSubscription(
  userId: string,
): Promise<SubscriptionResult> {
  await dbConnect();

  const user = await User.findById(userId);
  if (!user) {
    return { success: false, message: "User not found" };
  }

  let stripeSubscriptionId = user.subscription?.stripeSubscriptionId;

  // If stripeSubscriptionId is missing but user has an active subscription and Stripe customer,
  // try to retrieve it from Stripe
  if (
    !stripeSubscriptionId &&
    user.subscription?.isSubscriptionActive &&
    user.stripeCustomerId
  ) {
    console.log(
      "[StripeSubscription] reactivateSubscription: Missing stripeSubscriptionId, fetching from Stripe customer",
    );
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        stripeSubscriptionId = subscriptions.data[0].id;
        console.log(
          "[StripeSubscription] reactivateSubscription: Found active subscription:",
          stripeSubscriptionId,
        );

        // Update user document with the found subscription ID
        await User.findByIdAndUpdate(userId, {
          "subscription.stripeSubscriptionId": stripeSubscriptionId,
        });
        console.log(
          "[StripeSubscription] reactivateSubscription: Updated user document with subscription ID",
        );
      }
    } catch (error) {
      console.error(
        "[StripeSubscription] reactivateSubscription: Failed to fetch subscription from Stripe:",
        error,
      );
    }
  }

  if (!stripeSubscriptionId) {
    return { success: false, message: "No subscription found" };
  }

  try {
    const subscription = await stripe.subscriptions.update(
      stripeSubscriptionId,
      {
        cancel_at_period_end: false,
      },
    );

    await User.findByIdAndUpdate(userId, {
      "subscription.cancelAtPeriodEnd": false,
      "subscription.canceledAt": null,
    });

    return {
      success: true,
      message: "Subscription reactivated",
      subscriptionId: stripeSubscriptionId,
      status: subscription.status,
    };
  } catch (error: any) {
    console.error(
      "[StripeSubscription] Failed to reactivate subscription:",
      error,
    );
    return { success: false, message: error.message };
  }
}

/**
 * Cancel options with feedback for analytics
 */
export interface CancelSubscriptionOptions {
  cancelImmediately?: boolean; // true = cancel now, false = cancel at period end
  reason?: CancellationReason;
  feedbackText?: string;
}

/**
 * Extended cancellation result with analytics
 */
export interface CancelSubscriptionResult extends SubscriptionResult {
  accessEndsAt?: Date;
  feedbackRecorded?: boolean;
}

/**
 * Cancel a subscription with optional feedback tracking
 * Stores cancellation feedback for churn analytics
 */
export async function cancelSubscriptionWithFeedback(
  userId: string,
  options: CancelSubscriptionOptions = {},
): Promise<CancelSubscriptionResult> {
  const { cancelImmediately = false, reason, feedbackText } = options;

  await dbConnect();

  const user = await User.findById(userId);
  if (!user) {
    return { success: false, message: "User not found" };
  }

  let stripeSubscriptionId = user.subscription?.stripeSubscriptionId;

  // If stripeSubscriptionId is missing but user has an active subscription and Stripe customer,
  // try to retrieve it from Stripe
  if (
    !stripeSubscriptionId &&
    user.subscription?.isSubscriptionActive &&
    user.stripeCustomerId
  ) {
    console.log(
      "[StripeSubscription] cancelSubscription: Missing stripeSubscriptionId, fetching from Stripe customer",
    );
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        stripeSubscriptionId = subscriptions.data[0].id;
        console.log(
          "[StripeSubscription] cancelSubscription: Found active subscription:",
          stripeSubscriptionId,
        );

        // Update user document with the found subscription ID
        await User.findByIdAndUpdate(userId, {
          "subscription.stripeSubscriptionId": stripeSubscriptionId,
        });
        console.log(
          "[StripeSubscription] cancelSubscription: Updated user document with subscription ID",
        );
      }
    } catch (error) {
      console.error(
        "[StripeSubscription] cancelSubscription: Failed to fetch subscription from Stripe:",
        error,
      );
    }
  }

  if (!stripeSubscriptionId) {
    return { success: false, message: "No active subscription found" };
  }

  try {
    let subscription: Stripe.Subscription;
    let accessEndsAt: Date;

    if (cancelImmediately) {
      // Cancel immediately - access ends now
      subscription = await stripe.subscriptions.cancel(stripeSubscriptionId);
      accessEndsAt = new Date();
    } else {
      // Cancel at period end - keep access until expiry
      subscription = await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = subscription as any;
      if (sub.current_period_end && sub.current_period_end > 0) {
        accessEndsAt = new Date(sub.current_period_end * 1000);
      } else if (user.subscription?.subscriptionExpiryDate) {
        accessEndsAt = new Date(user.subscription.subscriptionExpiryDate);
        console.warn(
          "[StripeSubscription] Using subscriptionExpiryDate for accessEndsAt",
        );
      } else {
        // Fallback: 1 month from now
        accessEndsAt = new Date();
        accessEndsAt.setMonth(accessEndsAt.getMonth() + 1);
        console.warn(
          "[StripeSubscription] Using 1 month from now for accessEndsAt",
        );
      }
    }

    // Update user subscription status
    await User.findByIdAndUpdate(userId, {
      "subscription.cancelAtPeriodEnd": !cancelImmediately,
      "subscription.canceledAt": cancelImmediately ? new Date() : null,
      "subscription.subscriptionExpiryDate": accessEndsAt,
    });

    // Record cancellation feedback for analytics
    let feedbackRecorded = false;
    if (reason) {
      try {
        // Calculate months subscribed
        const subscriptionStart = user.subscription?.subscriptionStartDate;
        let monthsSubscribed: number | undefined;
        if (subscriptionStart) {
          const msPerMonth = 30 * 24 * 60 * 60 * 1000;
          monthsSubscribed = Math.floor(
            (Date.now() - new Date(subscriptionStart).getTime()) / msPerMonth,
          );
        }

        await CancellationFeedback.create({
          userId: user._id,
          subscriptionId: stripeSubscriptionId,
          tierId: user.subscription?.subscriptionTierId,
          tierName: user.subscription?.subscriptionPlan,
          reason,
          feedbackText: feedbackText?.slice(0, 2000), // Ensure max length
          cancelType: cancelImmediately ? "immediate" : "period_end",
          subscriptionStartDate: subscriptionStart,
          subscriptionEndDate: accessEndsAt,
          monthsSubscribed,
        });
        feedbackRecorded = true;
        console.log(
          `[StripeSubscription] Cancellation feedback recorded for user ${userId}`,
        );
      } catch (feedbackError) {
        // Don't fail the cancellation if feedback recording fails
        console.error(
          "[StripeSubscription] Failed to record cancellation feedback:",
          feedbackError,
        );
      }
    }

    // Refresh session to reflect updated subscription status
    try {
      await forceRefreshUserSession(userId, { maxRetries: 2 });
    } catch (cacheError) {
      console.warn(
        "[StripeSubscription] Cache refresh failed during cancellation:",
        cacheError,
      );
    }

    return {
      success: true,
      message: cancelImmediately
        ? "Subscription canceled immediately"
        : `Subscription will cancel on ${accessEndsAt.toLocaleDateString()}`,
      subscriptionId: stripeSubscriptionId,
      status: subscription.status,
      accessEndsAt,
      feedbackRecorded,
    };
  } catch (error: any) {
    console.error("[StripeSubscription] Failed to cancel subscription:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Preview proration for plan change - shows user what they'll pay/be credited
 */
export interface ProrationPreview {
  success: boolean;
  message?: string;
  preview?: {
    currentPlanName: string;
    newPlanName: string;
    currentPlanPrice: number;
    newPlanPrice: number;
    prorationAmount: number; // Positive = charge, negative = credit
    immediateCharge: number;
    nextBillingDate: Date;
    isUpgrade: boolean;
    currency: string;
  };
}

export async function getProrationPreview(
  userId: string,
  newTierId: string,
  billingInterval: "month" | "year" = "month",
  isTrialConversion: boolean = false,
): Promise<ProrationPreview> {
  console.log("[StripeSubscription] getProrationPreview called:", {
    userId,
    newTierId,
    billingInterval,
    isTrialConversion,
  });

  await dbConnect();

  const [user, newTier] = await Promise.all([
    User.findById(userId).populate("subscription.subscriptionTierId"),
    Tier.findById(newTierId),
  ]);

  if (!user) {
    console.error("[StripeSubscription] User not found:", userId);
    return { success: false, message: "User not found" };
  }

  if (!newTier) {
    console.error("[StripeSubscription] Tier not found:", newTierId);
    return { success: false, message: "Tier not found" };
  }

  console.log("[StripeSubscription] Found user and tier:", {
    userName: user.name,
    userEmail: user.email,
    tierName: newTier.name,
    isTrial: user.subscription?.isTrial,
    stripeSubscriptionId: user.subscription?.stripeSubscriptionId,
  });

  // Handle trial-to-paid conversion
  if (isTrialConversion && user.subscription?.isTrial) {
    console.log("[StripeSubscription] Handling trial-to-paid conversion");
    const tierMonthlyPrice = parseFloat(newTier.price) || 0;
    const tierAnnualPrice = newTier.annualPrice
      ? parseFloat(newTier.annualPrice)
      : tierMonthlyPrice * 12;
    const tierPrice =
      billingInterval === "year" ? tierAnnualPrice : tierMonthlyPrice;

    // Use user's trial expiry date if available, otherwise use 14 days from now
    let nextBillingDate: Date;
    if (user.subscription?.subscriptionExpiryDate) {
      nextBillingDate = new Date(user.subscription.subscriptionExpiryDate);
    } else {
      nextBillingDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    }

    return {
      success: true,
      preview: {
        currentPlanName: "14-Day Free Trial",
        newPlanName: newTier.name,
        currentPlanPrice: 0,
        newPlanPrice: tierPrice,
        prorationAmount: 0,
        immediateCharge: tierPrice,
        nextBillingDate,
        isUpgrade: true,
        currency: "usd",
      },
    };
  }

  let stripeSubscriptionId = user.subscription?.stripeSubscriptionId;

  // If stripeSubscriptionId is missing but user has an active subscription and Stripe customer,
  // try to retrieve it from Stripe
  if (
    !stripeSubscriptionId &&
    user.subscription?.isSubscriptionActive &&
    user.stripeCustomerId
  ) {
    console.log(
      "[StripeSubscription] Missing stripeSubscriptionId, fetching from Stripe customer",
    );
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        stripeSubscriptionId = subscriptions.data[0].id;
        console.log(
          "[StripeSubscription] Found active subscription:",
          stripeSubscriptionId,
        );

        // Update user document with the found subscription ID
        await User.findByIdAndUpdate(userId, {
          "subscription.stripeSubscriptionId": stripeSubscriptionId,
        });
        console.log(
          "[StripeSubscription] Updated user document with subscription ID",
        );
      }
    } catch (error) {
      console.error(
        "[StripeSubscription] Failed to fetch subscription from Stripe:",
        error,
      );
    }
  }

  if (!stripeSubscriptionId) {
    console.error("[StripeSubscription] No active subscription for user");
    return {
      success: false,
      message: "No active subscription. Please contact support.",
    };
  }

  // Get new price ID
  let newPriceId: string | undefined;
  if (billingInterval === "year") {
    newPriceId = newTier.stripeAnnualPriceId;
  } else {
    newPriceId = newTier.stripeMonthlyPriceId || newTier.stripePriceId;
  }

  console.log("[StripeSubscription] New price ID:", {
    newPriceId,
    billingInterval,
    stripeMonthlyPriceId: newTier.stripeMonthlyPriceId,
    stripeAnnualPriceId: newTier.stripeAnnualPriceId,
    stripePriceId: newTier.stripePriceId,
  });

  if (!newPriceId) {
    console.error(
      "[StripeSubscription] New tier has no Stripe Price configured",
    );
    return {
      success: false,
      message: "New tier has no Stripe Price configured",
    };
  }

  try {
    // Get current subscription
    const subscription =
      await stripe.subscriptions.retrieve(stripeSubscriptionId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = subscription as any;
    const subscriptionItemId = subscription.items.data[0]?.id;

    console.log("[StripeSubscription] Current subscription:", {
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId,
      currentPriceId: subscription.items.data[0]?.price?.id,
      status: subscription.status,
      current_period_end: sub.current_period_end,
      current_period_start: sub.current_period_start,
    });

    if (!subscriptionItemId) {
      console.error(
        "[StripeSubscription] Subscription item not found in subscription",
      );
      return { success: false, message: "Subscription item not found" };
    }

    // Create an invoice preview to see proration
    // Note: This preview may show accumulated line items from previous changes
    // Using "always_invoice" in actual update will create immediate invoice and clear these
    const preview = await stripe.invoices.createPreview({
      customer: subscription.customer as string,
      subscription: stripeSubscriptionId,
      subscription_details: {
        items: [
          {
            id: subscriptionItemId,
            price: newPriceId,
          },
        ],
        proration_behavior: "always_invoice",
      },
    });

    console.log("[StripeSubscription] Invoice preview created:", {
      amountDue: preview.amount_due,
      currency: preview.currency,
      lineItemsCount: preview.lines.data.length,
      lines: preview.lines.data.map((line: any) => ({
        description: line.description,
        amount: line.amount / 100,
        proration: line.proration,
        period: line.period
          ? {
              start: new Date(line.period.start * 1000).toLocaleDateString(),
              end: new Date(line.period.end * 1000).toLocaleDateString(),
            }
          : null,
      })),
    });

    // Get current tier info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentTier = (user.subscription as any)?.subscriptionTierId as
      | ITier
      | undefined;
    const currentPrice = subscription.items.data[0]?.price;

    // Calculate prices (tier.price is stored as string)
    const currentPlanPrice = currentPrice?.unit_amount
      ? currentPrice.unit_amount / 100
      : 0;
    const tierMonthlyPrice = parseFloat(newTier.price) || 0;
    const tierAnnualPrice = newTier.annualPrice
      ? parseFloat(newTier.annualPrice)
      : tierMonthlyPrice * 12;
    const newPlanPrice =
      billingInterval === "year" ? tierAnnualPrice : tierMonthlyPrice;
    const isUpgrade = newPlanPrice > currentPlanPrice;

    // Get proration details from line items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lines = preview.lines.data as any[];
    let prorationAmount = 0;
    for (const line of lines) {
      if (line.proration) {
        prorationAmount += line.amount;
      }
    }

    // Calculate next billing date - use current period end from subscription, fallback to user's expiry date
    let nextBillingDate: Date;
    if (sub.current_period_end && sub.current_period_end > 0) {
      nextBillingDate = new Date(sub.current_period_end * 1000);
      console.log(
        "[StripeSubscription] Using Stripe current_period_end for next billing date:",
        nextBillingDate,
      );
    } else if (user.subscription?.subscriptionExpiryDate) {
      nextBillingDate = new Date(user.subscription.subscriptionExpiryDate);
      console.warn(
        "[StripeSubscription] Using user's subscriptionExpiryDate as fallback for next billing date:",
        nextBillingDate,
      );
    } else {
      // Last resort: calculate 1 month from now
      nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      console.warn(
        "[StripeSubscription] Neither current_period_end nor subscriptionExpiryDate available, using 1 month from now:",
        nextBillingDate,
      );
    }

    const result = {
      success: true,
      preview: {
        currentPlanName:
          currentTier?.name ||
          user.subscription?.subscriptionPlan ||
          "Current Plan",
        newPlanName: newTier.name,
        currentPlanPrice,
        newPlanPrice,
        prorationAmount: prorationAmount / 100,
        immediateCharge: Math.max(0, preview.amount_due / 100),
        nextBillingDate,
        isUpgrade,
        currency: preview.currency || "usd",
      },
    };

    console.log("[StripeSubscription] Preview result:", result);

    return result;
  } catch (error: any) {
    console.error("[StripeSubscription] Failed to preview proration:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Change subscription plan (upgrade/downgrade)
 */
export async function changeSubscriptionPlan(
  userId: string,
  newTierId: string,
  billingInterval?: "month" | "year",
): Promise<SubscriptionResult> {
  await dbConnect();

  const [user, newTier] = await Promise.all([
    User.findById(userId),
    Tier.findById(newTierId),
  ]);

  if (!user) {
    return { success: false, message: "User not found" };
  }

  if (!newTier) {
    return { success: false, message: "Tier not found" };
  }

  let stripeSubscriptionId = user.subscription?.stripeSubscriptionId;
  const isTrialConversion = user.subscription?.isTrial && !stripeSubscriptionId;

  // If stripeSubscriptionId is missing but user has an active subscription and Stripe customer,
  // try to retrieve it from Stripe
  if (
    !stripeSubscriptionId &&
    !isTrialConversion &&
    user.subscription?.isSubscriptionActive &&
    user.stripeCustomerId
  ) {
    console.log(
      "[StripeSubscription] changeSubscriptionPlan: Missing stripeSubscriptionId, fetching from Stripe customer",
    );
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        stripeSubscriptionId = subscriptions.data[0].id;
        console.log(
          "[StripeSubscription] changeSubscriptionPlan: Found active subscription:",
          stripeSubscriptionId,
        );

        // Update user document with the found subscription ID
        await User.findByIdAndUpdate(userId, {
          "subscription.stripeSubscriptionId": stripeSubscriptionId,
        });
        console.log(
          "[StripeSubscription] changeSubscriptionPlan: Updated user document with subscription ID",
        );
      }
    } catch (error) {
      console.error(
        "[StripeSubscription] changeSubscriptionPlan: Failed to fetch subscription from Stripe:",
        error,
      );
    }
  }

  if (!stripeSubscriptionId && !isTrialConversion) {
    return {
      success: false,
      message: "No active subscription to change. Please contact support.",
    };
  }

  // Determine the new price ID
  const newBillingInterval = billingInterval || "month";
  let newPriceId: string | undefined;

  if (newBillingInterval === "year") {
    newPriceId = newTier.stripeAnnualPriceId;
  } else {
    newPriceId = newTier.stripeMonthlyPriceId || newTier.stripePriceId;
  }

  if (!newPriceId) {
    return {
      success: false,
      message: "New tier does not have a Stripe Price ID configured",
    };
  }

  try {
    // Handle trial-to-paid conversion: create a new subscription
    if (isTrialConversion) {
      const customerResult = await getOrCreateStripeCustomer(userId);
      if (!customerResult.success || !customerResult.customerId) {
        return {
          success: false,
          message: customerResult.message || "Failed to create customer",
        };
      }

      // Create new subscription from trial
      const trialEndTimestamp = user.subscription?.subscriptionExpiryDate
        ? Math.floor(user.subscription.subscriptionExpiryDate.getTime() / 1000)
        : Math.floor((Date.now() + 14 * 24 * 60 * 60 * 1000) / 1000);

      const subscriptionParams: any = {
        customer: customerResult.customerId,
        items: [{ price: newPriceId }],
        metadata: {
          tierId: newTierId,
          billingInterval: newBillingInterval,
          convertedFromTrial: "true",
          originalTrialStartDate:
            user.subscription?.subscriptionStartDate?.toISOString(),
        } as Stripe.MetadataParam,
        trial_end: trialEndTimestamp,
      };

      // Add coupon if tier has one
      if (newTier.stripeCouponId) {
        subscriptionParams.discounts = [{ coupon: newTier.stripeCouponId }];
      }

      const newSubscription =
        await stripe.subscriptions.create(subscriptionParams);

      // Update user subscription with new Stripe subscription ID
      await User.findByIdAndUpdate(userId, {
        $set: {
          "subscription.stripeSubscriptionId": newSubscription.id,
          "subscription.subscriptionTierId": newTierId,
          "subscription.billingInterval": newBillingInterval,
          "subscription.subscriptionTierType": newTier.tierType,
        },
      });

      return {
        success: true,
        message: "Trial converted to paid subscription successfully",
        subscriptionId: newSubscription.id,
        status: newSubscription.status,
      };
    }

    // Handle regular plan change
    const currentSubscription = await stripe.subscriptions.retrieve(
      stripeSubscriptionId!,
    );
    const subscriptionItemId = currentSubscription.items.data[0]?.id;

    if (!subscriptionItemId) {
      return { success: false, message: "Subscription item not found" };
    }

    // Update the subscription with new price
    // Use "always_invoice" to create an immediate invoice and avoid accumulating prorations
    const updateParams: any = {
      items: [
        {
          id: subscriptionItemId,
          price: newPriceId,
        },
      ],
      proration_behavior: "always_invoice", // Creates immediate invoice, prevents accumulation
      metadata: {
        tierId: newTierId,
        billingInterval: newBillingInterval,
      },
    };

    // Add coupon if tier has one (will apply to next invoice)
    if (newTier.stripeCouponId) {
      updateParams.discounts = [{ coupon: newTier.stripeCouponId }];
    }

    const updatedSubscription = await stripe.subscriptions.update(
      stripeSubscriptionId!,
      updateParams,
    );

    // SECURITY FIX: Do NOT update database here!
    // Plan change will be finalized when invoice.paid webhook confirms payment succeeded.
    // This prevents users from getting upgraded features if their card declines.
    console.log(
      "[StripeSubscription] Subscription updated in Stripe. Waiting for invoice.paid webhook to confirm payment...",
    );

    return {
      success: true,
      message:
        "Plan change initiated. Payment will be processed and your plan will update when payment is confirmed.",
      subscriptionId: stripeSubscriptionId,
      status: updatedSubscription.status,
    };
  } catch (error: any) {
    console.error("[StripeSubscription] Failed to change subscription:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Create a Stripe billing portal session for subscription management
 */
export async function createBillingPortalSession(
  userId: string,
  returnUrl: string,
): Promise<{ success: boolean; url?: string; message?: string }> {
  await dbConnect();

  const user = await User.findById(userId);
  if (!user) {
    return { success: false, message: "User not found" };
  }

  if (!user.stripeCustomerId) {
    return {
      success: false,
      message: "No Stripe customer found for this user",
    };
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
    });

    return { success: true, url: session.url };
  } catch (error: any) {
    console.error(
      "[StripeSubscription] Failed to create billing portal:",
      error,
    );
    return { success: false, message: error.message };
  }
}

// ============================================================
// PAYMENT METHOD MANAGEMENT
// ============================================================

export interface PaymentMethodInfo {
  id: string;
  type: string;
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
}

/**
 * Get all payment methods for a customer
 */
export async function getPaymentMethods(userId: string): Promise<{
  success: boolean;
  paymentMethods?: PaymentMethodInfo[];
  defaultPaymentMethodId?: string;
  message?: string;
}> {
  await dbConnect();

  const user = await User.findById(userId);
  if (!user) {
    return { success: false, message: "User not found" };
  }

  if (!user.stripeCustomerId) {
    return { success: false, message: "No Stripe customer found" };
  }

  try {
    // Get customer to find default payment method
    const customer = await stripe.customers.retrieve(user.stripeCustomerId);
    if (customer.deleted) {
      return { success: false, message: "Customer has been deleted" };
    }

    const defaultPaymentMethodId =
      typeof customer.invoice_settings?.default_payment_method === "string"
        ? customer.invoice_settings.default_payment_method
        : customer.invoice_settings?.default_payment_method?.id;

    // Get all payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: "card",
    });

    const formattedMethods: PaymentMethodInfo[] = paymentMethods.data.map(
      (pm) => ({
        id: pm.id,
        type: pm.type,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
        isDefault: pm.id === defaultPaymentMethodId,
      }),
    );

    return {
      success: true,
      paymentMethods: formattedMethods,
      defaultPaymentMethodId,
    };
  } catch (error: any) {
    console.error("[StripeSubscription] Failed to get payment methods:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Create a setup intent for adding a new payment method
 * Returns client secret for frontend Stripe Elements
 */
export async function createSetupIntent(userId: string): Promise<{
  success: boolean;
  clientSecret?: string;
  message?: string;
}> {
  await dbConnect();

  const user = await User.findById(userId);
  if (!user) {
    return { success: false, message: "User not found" };
  }

  // Ensure customer exists
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customerResult = await getOrCreateStripeCustomer(userId);
    if (!customerResult.success || !customerResult.customerId) {
      return { success: false, message: "Failed to create customer" };
    }
    customerId = customerResult.customerId;
  }

  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      usage: "off_session", // Allow for recurring payments
    });

    return {
      success: true,
      clientSecret: setupIntent.client_secret || undefined,
    };
  } catch (error: any) {
    console.error("[StripeSubscription] Failed to create setup intent:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Set a payment method as the default for subscriptions
 */
export async function setDefaultPaymentMethod(
  userId: string,
  paymentMethodId: string,
): Promise<{ success: boolean; message?: string }> {
  await dbConnect();

  const user = await User.findById(userId);
  if (!user) {
    return { success: false, message: "User not found" };
  }

  if (!user.stripeCustomerId) {
    return { success: false, message: "No Stripe customer found" };
  }

  try {
    // Update customer's default payment method
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Also update the subscription's default payment method if exists
    const stripeSubscriptionId = user.subscription?.stripeSubscriptionId;
    if (stripeSubscriptionId) {
      await stripe.subscriptions.update(stripeSubscriptionId, {
        default_payment_method: paymentMethodId,
      });
    }

    return { success: true, message: "Default payment method updated" };
  } catch (error: any) {
    console.error(
      "[StripeSubscription] Failed to set default payment method:",
      error,
    );
    return { success: false, message: error.message };
  }
}

/**
 * Remove a payment method
 */
export async function removePaymentMethod(
  userId: string,
  paymentMethodId: string,
): Promise<{ success: boolean; message?: string }> {
  await dbConnect();

  const user = await User.findById(userId);
  if (!user) {
    return { success: false, message: "User not found" };
  }

  if (!user.stripeCustomerId) {
    return { success: false, message: "No Stripe customer found" };
  }

  try {
    // Verify the payment method belongs to this customer
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod.customer !== user.stripeCustomerId) {
      return {
        success: false,
        message: "Payment method does not belong to user",
      };
    }

    // Check if it's the default - don't allow removal
    const customer = await stripe.customers.retrieve(user.stripeCustomerId);
    if (!customer.deleted) {
      const defaultPmId = customer.invoice_settings?.default_payment_method;
      if (
        (typeof defaultPmId === "string" && defaultPmId === paymentMethodId) ||
        (typeof defaultPmId === "object" && defaultPmId?.id === paymentMethodId)
      ) {
        return {
          success: false,
          message:
            "Cannot remove default payment method. Set another as default first.",
        };
      }
    }

    // Detach the payment method
    await stripe.paymentMethods.detach(paymentMethodId);

    return { success: true, message: "Payment method removed" };
  } catch (error: any) {
    console.error(
      "[StripeSubscription] Failed to remove payment method:",
      error,
    );
    return { success: false, message: error.message };
  }
}

/**
 * Attach a payment method to a customer (after setup intent confirmation)
 * and optionally set as default
 */
export async function attachPaymentMethod(
  userId: string,
  paymentMethodId: string,
  setAsDefault: boolean = true,
): Promise<{ success: boolean; message?: string }> {
  await dbConnect();

  const user = await User.findById(userId);
  if (!user) {
    return { success: false, message: "User not found" };
  }

  if (!user.stripeCustomerId) {
    return { success: false, message: "No Stripe customer found" };
  }

  try {
    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.stripeCustomerId,
    });

    // Set as default if requested
    if (setAsDefault) {
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Update subscription default too
      const stripeSubscriptionId = user.subscription?.stripeSubscriptionId;
      if (stripeSubscriptionId) {
        await stripe.subscriptions.update(stripeSubscriptionId, {
          default_payment_method: paymentMethodId,
        });
      }
    }

    return { success: true, message: "Payment method added successfully" };
  } catch (error: any) {
    console.error(
      "[StripeSubscription] Failed to attach payment method:",
      error,
    );
    return { success: false, message: error.message };
  }
}

/**
 * Get subscription details from Stripe
 */
export async function getSubscriptionDetails(userId: string): Promise<{
  success: boolean;
  subscription?: Stripe.Subscription;
  message?: string;
}> {
  await dbConnect();

  const user = await User.findById(userId);
  if (!user) {
    return { success: false, message: "User not found" };
  }

  let stripeSubscriptionId = user.subscription?.stripeSubscriptionId;

  // If stripeSubscriptionId is missing but user has an active subscription and Stripe customer,
  // try to retrieve it from Stripe
  if (
    !stripeSubscriptionId &&
    user.subscription?.isSubscriptionActive &&
    user.stripeCustomerId
  ) {
    console.log(
      "[StripeSubscription] getSubscriptionDetails: Missing stripeSubscriptionId, fetching from Stripe customer",
    );
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        stripeSubscriptionId = subscriptions.data[0].id;
        console.log(
          "[StripeSubscription] getSubscriptionDetails: Found active subscription:",
          stripeSubscriptionId,
        );

        // Update user document with the found subscription ID
        await User.findByIdAndUpdate(userId, {
          "subscription.stripeSubscriptionId": stripeSubscriptionId,
        });
        console.log(
          "[StripeSubscription] getSubscriptionDetails: Updated user document with subscription ID",
        );
      }
    } catch (error) {
      console.error(
        "[StripeSubscription] getSubscriptionDetails: Failed to fetch subscription from Stripe:",
        error,
      );
    }
  }

  if (!stripeSubscriptionId) {
    return { success: false, message: "No subscription found" };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(
      stripeSubscriptionId,
      {
        expand: ["default_payment_method", "latest_invoice"],
      },
    );

    return { success: true, subscription };
  } catch (error: any) {
    console.error(
      "[StripeSubscription] Failed to get subscription details:",
      error,
    );
    return { success: false, message: error.message };
  }
}

/**
 * Handle subscription activation from webhook
 */
export async function activateSubscription(
  stripeSubscription: Stripe.Subscription,
  tierId: string,
  userId: string,
): Promise<{ success: boolean; message?: string }> {
  await dbConnect();

  const tier = await Tier.findById(tierId);
  if (!tier) {
    return { success: false, message: "Tier not found" };
  }

  const user = await User.findById(userId);
  if (!user) {
    return { success: false, message: "User not found" };
  }

  // Calculate dates from Stripe subscription
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = stripeSubscription as any;

  // Validate and calculate dates with fallbacks
  const startDate =
    sub.current_period_start && sub.current_period_start > 0
      ? new Date(sub.current_period_start * 1000)
      : new Date();

  const expiryDate =
    sub.current_period_end && sub.current_period_end > 0
      ? new Date(sub.current_period_end * 1000)
      : (() => {
          const fallbackDate = new Date();
          fallbackDate.setMonth(fallbackDate.getMonth() + 1);
          console.warn(
            "[StripeSubscription] activateSubscription: Invalid current_period_end, using 1 month from now",
          );
          return fallbackDate;
        })();

  // Calculate billing interval from subscription
  const billingInterval =
    stripeSubscription.items.data[0]?.price?.recurring?.interval || "month";

  // Get actual price from Stripe subscription (authoritative billing source)
  const stripePrice = stripeSubscription.items.data[0]?.price;
  const actualPriceInCents = stripePrice?.unit_amount || 0;
  const actualPrice = actualPriceInCents / 100;

  // Check for applied discount (use first discount if available)
  const discounts = stripeSubscription.discounts;
  // Type workaround: Stripe SDK types discounts as string[] but they can be expanded Discount objects
  type ExpandedDiscount = { coupon?: { id?: string; percent_off?: number } };
  const firstDiscount: ExpandedDiscount | null =
    Array.isArray(discounts) && discounts.length > 0
      ? (discounts[0] as unknown as ExpandedDiscount)
      : null;
  const appliedCoupon = firstDiscount?.coupon?.id || null;
  const discountPercent = firstDiscount?.coupon?.percent_off || 0;

  // Calculate effective price after discount
  const effectivePrice =
    discountPercent > 0
      ? actualPrice * (1 - discountPercent / 100)
      : actualPrice;

  console.log(
    `[StripeSubscription] Activating subscription: base=$${actualPrice}, discount=${discountPercent}%, effective=$${effectivePrice}`,
  );

  // Update user subscription
  await User.findByIdAndUpdate(userId, {
    $set: {
      "subscription.subscriptionPlan": tier.name,
      "subscription.subscriptionStartDate": startDate,
      "subscription.subscriptionExpiryDate": expiryDate,
      "subscription.isSubscriptionActive": true,
      "subscription.isTrial": false,
      "subscription.subscriptionPaymentMethod": "stripe",
      "subscription.subscriptionTierId": tierId,
      "subscription.subscriptionTierType": tier.tierType,
      "subscription.subscriptionTierUserType": tier.tierUserType,
      // Store ACTUAL price from Stripe (authoritative billing source)
      "subscription.subscriptionPrice": effectivePrice,
      "subscription.subscriptionBasePrice": actualPrice,
      "subscription.appliedCoupon": appliedCoupon,
      "subscription.discountPercent": discountPercent,
      "subscription.stripeSubscriptionId": stripeSubscription.id,
      "subscription.billingInterval": billingInterval,
      "subscription.cancelAtPeriodEnd": stripeSubscription.cancel_at_period_end,
      "subscription.subscriptionLimits": {
        // Core Limits
        forms: tier.tierLimits?.forms || 1,
        leads: tier.tierLimits?.leads || 100,
        buyers: tier.tierLimits?.buyers || 5,
        industries: tier.tierLimits?.industries || 1,

        // Call Tracking & Telephony
        numbers: tier.tierLimits?.numbers || 1,
        twilioNumbers: tier.tierLimits?.twilioNumbers || 0,
        callSeconds: tier.tierLimits?.callSeconds || 1000,
        callRecording: tier.tierLimits?.callRecording || false,
        callTranscription: tier.tierLimits?.callTranscription || false,
        callAIAnalysis: tier.tierLimits?.callAIAnalysis || false,
        multiRingForwarding: tier.tierLimits?.multiRingForwarding || false,
        geoRouting: tier.tierLimits?.geoRouting || false,
        scheduledCallbacks: tier.tierLimits?.scheduledCallbacks || false,
        concurrentCallLimit: tier.tierLimits?.concurrentCallLimit || 1,

        // Marketing & Campaigns
        emailCampaignsEnabled: tier.tierLimits?.emailCampaignsEnabled || false,
        smsCampaignsPerMonth: tier.tierLimits?.smsCampaignsPerMonth || 0,
        smsRecipientsPerCampaign:
          tier.tierLimits?.smsRecipientsPerCampaign || 50,
        smsPhoneNumbers: tier.tierLimits?.smsPhoneNumbers || 0,

        // Automation & Workflows
        automationWorkflows: tier.tierLimits?.automationWorkflows || 0,
        automationActionsPerWorkflow:
          tier.tierLimits?.automationActionsPerWorkflow || 3,

        // AI & Advanced Features
        chatbotEnabled: tier.tierLimits?.chatbotEnabled || false,
        leadScoringEnabled: tier.tierLimits?.leadScoringEnabled || false,
        sentimentAnalysisEnabled:
          tier.tierLimits?.sentimentAnalysisEnabled || false,
        aiSummariesEnabled: tier.tierLimits?.aiSummariesEnabled || false,

        // Invoicing & Payments
        invoicesPerMonth: tier.tierLimits?.invoicesPerMonth || 10,
        customInvoiceBranding: tier.tierLimits?.customInvoiceBranding || false,

        // Integrations
        zapierIntegration: tier.tierLimits?.zapierIntegration || false,
        webhookIntegration: tier.tierLimits?.webhookIntegration || false,
        apiAccess: tier.tierLimits?.apiAccess || false,
        maxWebhooks: tier.tierLimits?.maxWebhooks || 0,

        // Marketplace & Distribution
        marketplaceAccess: tier.tierLimits?.marketplaceAccess || false,
        exclusiveLeads: tier.tierLimits?.exclusiveLeads || false,
        leadDistributionRules: tier.tierLimits?.leadDistributionRules || false,

        // Data & Reporting
        exports: tier.tierLimits?.exports || false,
        imports: tier.tierLimits?.imports || false,
        advancedReports: tier.tierLimits?.advancedReports || false,
        dataRetentionDays: tier.tierLimits?.dataRetentionDays || 90,

        // Team & Access
        teamMembers: tier.tierLimits?.teamMembers || 1,
        maxConcurrentSessions: tier.tierLimits?.maxConcurrentSessions || 1,

        // Support
        liveSupport: tier.tierLimits?.liveSupport || false,
        prioritySupport: tier.tierLimits?.prioritySupport || false,

        // Customization
        customBranding: tier.tierLimits?.customBranding || false,
        customDomain: tier.tierLimits?.customDomain || false,
      },
      // Reset usage for new billing period
      "subscription.subscriptionUsage.leads": 0,
      "subscription.subscriptionUsage.callSeconds": 0,
      "subscription.subscriptionUsage.emailCampaigns": 0,
      "subscription.subscriptionUsage.smsCampaigns": 0,
      "subscription.subscriptionUsage.workflowExecutions": 0,
      "subscription.subscriptionUsage.invoices": 0,
      "subscription.subscriptionUsage.usagePeriodStart": startDate,
      "subscription.subscriptionUsage.usagePeriodEnd": expiryDate,
    },
  });

  // Force refresh session to prevent race conditions
  const refreshResult = await forceRefreshUserSession(userId, {
    maxRetries: 3,
  });
  if (!refreshResult.success) {
    console.error(
      "[StripeSubscription] Session refresh failed:",
      refreshResult.error,
    );
    // Fallback: ensure cache is at least invalidated
    if (user?.email) {
      await invalidateSessionWithConfirmation(user.email, userId);
    }
  }

  return { success: true, message: "Subscription activated" };
}

/**
 * Handle subscription cancellation from webhook
 */
export async function deactivateSubscription(
  stripeSubscriptionId: string,
): Promise<{ success: boolean; message?: string }> {
  await dbConnect();

  const user = (await User.findOne({
    "subscription.stripeSubscriptionId": stripeSubscriptionId,
  })) as (IUser & { _id: string }) | null;

  if (!user) {
    return { success: false, message: "User with subscription not found" };
  }

  await User.findByIdAndUpdate(user._id, {
    "subscription.isSubscriptionActive": false,
    "subscription.canceledAt": new Date(),
  });

  // Force refresh session to reflect cancelled state immediately
  const refreshResult = await forceRefreshUserSession(user._id.toString(), {
    maxRetries: 3,
  });
  if (!refreshResult.success) {
    console.error(
      "[StripeSubscription] Session refresh failed:",
      refreshResult.error,
    );
    if (user?.email) {
      await invalidateSessionWithConfirmation(user.email, user._id.toString());
    }
  }

  return { success: true, message: "Subscription deactivated" };
}

/**
 * Handle invoice payment success - renews subscription period
 */
export async function handleInvoicePaid(
  invoice: Stripe.Invoice,
): Promise<{ success: boolean; message?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = invoice as any;
  if (!inv.subscription) {
    return { success: false, message: "Invoice has no subscription" };
  }

  await dbConnect();

  const stripeSubscriptionId =
    typeof inv.subscription === "string"
      ? inv.subscription
      : inv.subscription.id;

  // Find user by subscription ID
  const user = (await User.findOne({
    "subscription.stripeSubscriptionId": stripeSubscriptionId,
  })) as (IUser & { _id: string }) | null;

  if (!user) {
    // Might be initial subscription, handled by checkout.session.completed
    return {
      success: true,
      message: "User not found - likely initial subscription",
    };
  }

  // Get subscription to get the new period dates
  const subscription =
    await stripe.subscriptions.retrieve(stripeSubscriptionId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subData = subscription as any;

  // Validate and calculate dates with fallbacks
  const newExpiryDate =
    subData.current_period_end && subData.current_period_end > 0
      ? new Date(subData.current_period_end * 1000)
      : (() => {
          const fallbackDate = new Date();
          fallbackDate.setMonth(fallbackDate.getMonth() + 1);
          console.warn(
            "[StripeSubscription] handleInvoicePaid: Invalid current_period_end, using 1 month from now",
          );
          return fallbackDate;
        })();

  const periodStart =
    subData.current_period_start && subData.current_period_start > 0
      ? new Date(subData.current_period_start * 1000)
      : new Date();

  // SECURITY FIX: Get tier information from Stripe subscription metadata
  // This allows us to finalize pending plan changes ONLY after payment succeeds
  const tierId =
    subData.metadata?.tierId || user.subscription?.subscriptionTierId;
  const billingInterval =
    subData.metadata?.billingInterval ||
    user.subscription?.billingInterval ||
    "month";

  let tierUpdate = {};
  let renewalPriceUpdate = {};

  if (tierId) {
    try {
      const tier = await Tier.findById(tierId);
      if (tier) {
        // Calculate renewal price
        if (tier.renewalPrice) {
          const durationMonths = billingInterval === "year" ? 12 : 1;
          const renewalPrice = parseFloat(tier.renewalPrice) * durationMonths;
          renewalPriceUpdate = {
            "subscription.subscriptionRenewalPrice": renewalPrice,
          };
        }

        // Update tier information (this finalizes any pending plan changes!)
        tierUpdate = {
          "subscription.subscriptionTierId": tierId,
          "subscription.subscriptionPlan": tier.name,
          "subscription.subscriptionTierType": tier.tierType,
          "subscription.billingInterval": billingInterval,
        };

        console.log(
          "[StripeSubscription] handleInvoicePaid: Finalizing plan change to",
          tier.name,
        );
      }
    } catch (tierError) {
      console.warn(
        "[StripeSubscription] handleInvoicePaid: Failed to fetch tier:",
        tierError,
      );
    }
  }

  // Update expiry date, reset usage counters, and finalize any plan changes
  await User.findByIdAndUpdate(user._id, {
    "subscription.subscriptionExpiryDate": newExpiryDate,
    "subscription.isSubscriptionActive": true,
    "subscription.subscriptionRenewalDate": new Date(),
    // Reset usage for new billing period
    "subscription.subscriptionUsage.leads": 0,
    "subscription.subscriptionUsage.callSeconds": 0,
    "subscription.subscriptionUsage.emailCampaigns": 0,
    "subscription.subscriptionUsage.smsCampaigns": 0,
    "subscription.subscriptionUsage.workflowExecutions": 0,
    "subscription.subscriptionUsage.invoices": 0,
    "subscription.subscriptionUsage.usagePeriodStart": periodStart,
    "subscription.subscriptionUsage.usagePeriodEnd": newExpiryDate,
    ...tierUpdate,
    ...renewalPriceUpdate,
  });

  // Force refresh session with renewed subscription data
  const refreshResult = await forceRefreshUserSession(user._id.toString(), {
    maxRetries: 3,
  });
  if (!refreshResult.success) {
    console.error(
      "[StripeSubscription] Session refresh failed:",
      refreshResult.error,
    );
    if (user?.email) {
      await invalidateSessionWithConfirmation(user.email, user._id.toString());
    }
  }

  return { success: true, message: "Subscription renewed" };
}

/**
 * Handle payment failure - subscription may be past_due
 */
export async function handlePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<{ success: boolean; message?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = invoice as any;
  if (!inv.subscription) {
    return { success: false, message: "Invoice has no subscription" };
  }

  await dbConnect();

  const stripeSubscriptionId =
    typeof inv.subscription === "string"
      ? inv.subscription
      : inv.subscription.id;

  const user = await User.findOne({
    "subscription.stripeSubscriptionId": stripeSubscriptionId,
  });

  if (!user) {
    return { success: false, message: "User not found" };
  }

  // Check if this was a plan change attempt (metadata in subscription)
  try {
    const subscription =
      await stripe.subscriptions.retrieve(stripeSubscriptionId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subData = subscription as any;

    if (subData.metadata?.tierId) {
      const tier = await Tier.findById(subData.metadata.tierId);
      if (tier) {
        console.error(
          `[StripeSubscription] PLAN CHANGE FAILED - Payment failed for upgrade to ${tier.name} for user ${user.email}`,
        );
      }
    }
  } catch (error) {
    console.error(
      "[StripeSubscription] Failed to retrieve subscription for payment failure:",
      error,
    );
  }

  // Mark subscription as past due - but don't deactivate immediately
  // Stripe will handle retries according to your billing settings
  await User.findByIdAndUpdate(user._id, {
    "subscription.paymentFailed": true,
    "subscription.lastPaymentFailedAt": new Date(),
  });

  // TODO: Send notification email to user about failed payment

  return { success: true, message: "Payment failure recorded" };
}
