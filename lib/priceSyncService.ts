/**
 * Price Sync Service
 *
 * Ensures price consistency between Tier model and Stripe.
 * Handles:
 * - Price validation between local tiers and Stripe prices
 * - Stripe Coupon management for discounts (instead of local discountedPrice)
 * - Price audit logging for billing compliance
 * - Automatic sync on tier price changes
 */

import Stripe from "stripe";
import { Tier, ITier } from "@/models/tier";
import { PriceAuditLog } from "@/models/priceAuditLog";
import connectDB from "./connectdb";
import { sendNotification } from "./notificationService";
import { resolveTierPrice, type SupportedCurrency } from "./currency";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

/**
 * Price validation result
 */
interface PriceValidationResult {
  valid: boolean;
  tierId: string;
  tierName: string;
  localPrice: number;
  stripePrice: number | null;
  stripePriceId: string | null;
  discrepancy: number | null;
  message: string;
}

/**
 * Price audit log entry
 */
interface PriceAuditEntry {
  timestamp: Date;
  tierId: string;
  tierName: string;
  action:
    | "validation"
    | "sync"
    | "mismatch"
    | "coupon_created"
    | "coupon_applied";
  localPrice: number;
  stripePrice: number | null;
  stripePriceId: string | null;
  couponId?: string;
  discountPercent?: number;
  details: string;
  resolved: boolean;
}

/**
 * Log a price audit entry. Durable (Mongo-backed) rather than in-memory —
 * this is billing-compliance history, so it needs to survive a restart and
 * be visible across every serverless instance, not just the one that
 * happened to handle a given request. Best-effort like the rest of this
 * app's audit logging: a write failure here must never break the actual
 * price validation/sync operation it's describing.
 */
async function logPriceAudit(
  entry: Omit<PriceAuditEntry, "timestamp">,
): Promise<void> {
  // Log to console for monitoring regardless of whether the durable write
  // below succeeds.
  console.log(
    `[PRICE_AUDIT] ${entry.action.toUpperCase()}: ${entry.tierName} - ${entry.details}`,
  );

  try {
    await connectDB();
    await PriceAuditLog.create(entry);
  } catch (error) {
    console.error("[PriceSync] Failed to record price audit entry:", error);
  }
}

/**
 * Get the price from Stripe for a given price ID
 */
async function getStripePriceAmount(
  stripePriceId: string,
): Promise<number | null> {
  try {
    const price = await stripe.prices.retrieve(stripePriceId);
    return price.unit_amount ? price.unit_amount / 100 : null;
  } catch (error) {
    console.error(`Failed to retrieve Stripe price ${stripePriceId}:`, error);
    return null;
  }
}

/**
 * Validate that a tier's local price matches its Stripe price
 */
export async function validateTierPrice(
  tierId: string,
  billingInterval: "month" | "year" = "month",
): Promise<PriceValidationResult> {
  await connectDB();

  const tier = await Tier.findById(tierId);
  if (!tier) {
    return {
      valid: false,
      tierId,
      tierName: "Unknown",
      localPrice: 0,
      stripePrice: null,
      stripePriceId: null,
      discrepancy: null,
      message: "Tier not found",
    };
  }

  // Get the appropriate price ID and local price based on billing interval
  const stripePriceId =
    billingInterval === "year"
      ? tier.stripeAnnualPriceId || tier.stripePriceId
      : tier.stripeMonthlyPriceId || tier.stripePriceId;

  const localPrice =
    billingInterval === "year"
      ? parseFloat(tier.annualPrice || tier.price)
      : parseFloat(tier.price);

  if (!stripePriceId) {
    await logPriceAudit({
      tierId,
      tierName: tier.name,
      action: "validation",
      localPrice,
      stripePrice: null,
      stripePriceId: null,
      details: "No Stripe price ID configured - will use dynamic pricing",
      resolved: true,
    });

    return {
      valid: true, // Valid because dynamic pricing will be used
      tierId,
      tierName: tier.name,
      localPrice,
      stripePrice: null,
      stripePriceId: null,
      discrepancy: null,
      message: "No Stripe price ID - dynamic pricing will be used",
    };
  }

  // Get the actual price from Stripe
  const stripePrice = await getStripePriceAmount(stripePriceId);

  if (stripePrice === null) {
    await logPriceAudit({
      tierId,
      tierName: tier.name,
      action: "mismatch",
      localPrice,
      stripePrice: null,
      stripePriceId,
      details: "Failed to retrieve Stripe price - price ID may be invalid",
      resolved: false,
    });

    return {
      valid: false,
      tierId,
      tierName: tier.name,
      localPrice,
      stripePrice: null,
      stripePriceId,
      discrepancy: null,
      message: "Failed to retrieve Stripe price",
    };
  }

  // Calculate discrepancy (allow for small floating point errors)
  const discrepancy = Math.abs(localPrice - stripePrice);
  const valid = discrepancy < 0.01; // Allow 1 cent tolerance

  await logPriceAudit({
    tierId,
    tierName: tier.name,
    action: valid ? "validation" : "mismatch",
    localPrice,
    stripePrice,
    stripePriceId,
    details: valid
      ? "Price validation passed"
      : `Price mismatch: local=$${localPrice}, stripe=$${stripePrice}`,
    resolved: valid,
  });

  return {
    valid,
    tierId,
    tierName: tier.name,
    localPrice,
    stripePrice,
    stripePriceId,
    discrepancy,
    message: valid
      ? "Prices match"
      : `Price mismatch: local $${localPrice} vs Stripe $${stripePrice}`,
  };
}

/**
 * Validate all tier prices against Stripe
 */
export async function validateAllTierPrices(): Promise<{
  results: PriceValidationResult[];
  allValid: boolean;
  mismatches: PriceValidationResult[];
}> {
  await connectDB();

  const tiers = await Tier.find({ isActive: true });
  const results: PriceValidationResult[] = [];
  const mismatches: PriceValidationResult[] = [];

  for (const tier of tiers) {
    const tierId = (tier._id as { toString(): string }).toString();
    // Validate monthly price
    const monthlyResult = await validateTierPrice(tierId, "month");
    results.push(monthlyResult);
    if (!monthlyResult.valid && monthlyResult.stripePrice !== null) {
      mismatches.push(monthlyResult);
    }

    // Validate annual price if exists
    if (tier.stripeAnnualPriceId) {
      const annualResult = await validateTierPrice(tierId, "year");
      results.push(annualResult);
      if (!annualResult.valid && annualResult.stripePrice !== null) {
        mismatches.push(annualResult);
      }
    }
  }

  return {
    results,
    allValid: mismatches.length === 0,
    mismatches,
  };
}

/**
 * Create a Stripe Price for a tier
 */
export async function createStripePriceForTier(
  tierId: string,
  billingInterval: "month" | "year" = "month",
): Promise<{
  success: boolean;
  priceId?: string;
  error?: string;
}> {
  await connectDB();

  const tier = await Tier.findById(tierId);
  if (!tier) {
    return { success: false, error: "Tier not found" };
  }

  // Ensure product exists
  let productId = tier.stripeProductId;
  if (!productId) {
    try {
      const product = await stripe.products.create({
        name: tier.name,
        description: tier.description || `${tier.name} subscription plan`,
        metadata: {
          tierId: tierId,
          tierType: tier.tierType,
        },
      });
      productId = product.id;

      // Update tier with product ID
      tier.stripeProductId = productId;
      await tier.save();
    } catch (error) {
      console.error("Failed to create Stripe product:", error);
      return { success: false, error: "Failed to create Stripe product" };
    }
  }

  // Calculate price in cents
  const priceAmount =
    billingInterval === "year"
      ? parseFloat(tier.annualPrice || tier.price) * 100
      : parseFloat(tier.price) * 100;

  try {
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: Math.round(priceAmount),
      currency: "usd",
      recurring: {
        interval: billingInterval,
        interval_count: 1,
      },
      metadata: {
        tierId,
        tierName: tier.name,
        billingInterval,
      },
    });

    // Update tier with new price ID
    if (billingInterval === "year") {
      tier.stripeAnnualPriceId = price.id;
    } else {
      tier.stripeMonthlyPriceId = price.id;
    }
    await tier.save();

    await logPriceAudit({
      tierId: tierId,
      tierName: tier.name,
      action: "sync",
      localPrice: priceAmount / 100,
      stripePrice: priceAmount / 100,
      stripePriceId: price.id,
      details: `Created new Stripe price for ${billingInterval}ly billing`,
      resolved: true,
    });

    // Also create/refresh the GBP and CAD equivalents so a seller/buyer
    // billing in one of those currencies always has a matching Stripe price.
    await createNonUsdStripePricesForTier(tier, productId, billingInterval);

    return { success: true, priceId: price.id };
  } catch (error) {
    console.error("Failed to create Stripe price:", error);
    return { success: false, error: "Failed to create Stripe price" };
  }
}

const PRICE_ID_FIELD: Record<
  Exclude<SupportedCurrency, "usd">,
  Record<"month" | "year", "stripeMonthlyPriceIdGBP" | "stripeAnnualPriceIdGBP" | "stripeMonthlyPriceIdCAD" | "stripeAnnualPriceIdCAD">
> = {
  gbp: { month: "stripeMonthlyPriceIdGBP", year: "stripeAnnualPriceIdGBP" },
  cad: { month: "stripeMonthlyPriceIdCAD", year: "stripeAnnualPriceIdCAD" },
};

/**
 * Creates (or re-creates) the GBP and CAD Stripe prices for a tier, mirroring
 * whatever the USD price already represents. Stripe prices are immutable
 * once created, so "syncing" a changed amount means creating a new Price and
 * swapping the stored ID — same pattern the USD path already uses.
 */
async function createNonUsdStripePricesForTier(
  tier: ITier,
  productId: string,
  billingInterval: "month" | "year",
): Promise<void> {
  const currencies: Exclude<SupportedCurrency, "usd">[] = ["gbp", "cad"];

  for (const currency of currencies) {
    try {
      const amount = resolveTierPrice(tier, currency, billingInterval);
      if (!amount || amount <= 0) continue;

      const price = await stripe.prices.create({
        product: productId,
        unit_amount: Math.round(amount * 100),
        currency,
        recurring: {
          interval: billingInterval,
          interval_count: 1,
        },
        metadata: {
          tierId: String(tier._id),
          tierName: tier.name,
          billingInterval,
          currency,
        },
      });

      tier.set(PRICE_ID_FIELD[currency][billingInterval], price.id);
    } catch (error) {
      // Non-fatal: USD checkout must keep working even if a secondary
      // currency price fails to sync (e.g. transient Stripe API issue).
      console.error(
        `[PriceSync] Failed to create ${currency} price for tier ${tier.name}:`,
        error,
      );
    }
  }

  await tier.save();
}

/**
 * Stripe Coupon representing a discount
 */
interface StripeCoupon {
  id: string;
  percentOff: number;
  amountOff?: number;
  duration: "once" | "repeating" | "forever";
  durationInMonths?: number;
}

/**
 * Create a Stripe Coupon for a discount percentage
 * This replaces local discountedPrice calculation with proper Stripe coupons
 */
export async function createOrGetStripeCoupon(
  percentOff: number,
  duration: "once" | "repeating" | "forever" = "forever",
  durationInMonths?: number,
): Promise<{ success: boolean; coupon?: StripeCoupon; error?: string }> {
  // Generate a consistent coupon ID based on parameters
  const couponId = `discount_${percentOff}pct_${duration}${durationInMonths ? `_${durationInMonths}mo` : ""}`;

  try {
    // Try to retrieve existing coupon
    const existingCoupon = await stripe.coupons.retrieve(couponId);
    return {
      success: true,
      coupon: {
        id: existingCoupon.id,
        percentOff: existingCoupon.percent_off!,
        duration: existingCoupon.duration as "once" | "repeating" | "forever",
        durationInMonths: existingCoupon.duration_in_months || undefined,
      },
    };
  } catch {
    // Coupon doesn't exist, create it
    try {
      const newCoupon = await stripe.coupons.create({
        id: couponId,
        percent_off: percentOff,
        duration,
        duration_in_months:
          duration === "repeating" ? durationInMonths : undefined,
        metadata: {
          source: "price_sync_service",
          created_at: new Date().toISOString(),
        },
      });

      await logPriceAudit({
        tierId: "system",
        tierName: "System",
        action: "coupon_created",
        localPrice: 0,
        stripePrice: null,
        stripePriceId: null,
        couponId: newCoupon.id,
        discountPercent: percentOff,
        details: `Created Stripe coupon: ${percentOff}% off, ${duration}`,
        resolved: true,
      });

      return {
        success: true,
        coupon: {
          id: newCoupon.id,
          percentOff: newCoupon.percent_off!,
          duration: newCoupon.duration as "once" | "repeating" | "forever",
          durationInMonths: newCoupon.duration_in_months || undefined,
        },
      };
    } catch (error) {
      console.error("Failed to create Stripe coupon:", error);
      return { success: false, error: "Failed to create Stripe coupon" };
    }
  }
}

/**
 * Get the appropriate coupon for a tier's discount
 * Returns coupon ID if tier has discountPercentage, null otherwise
 *
 * Supports three discount durations:
 * - "once": Discount applies to first payment only (intro offer)
 * - "forever": Discount applies to all payments (permanent discount)
 * - "repeating": Discount applies for X months (promotional period)
 */
export async function getCouponForTierDiscount(
  tierId: string,
): Promise<string | null> {
  await connectDB();

  const tier = await Tier.findById(tierId);
  if (!tier || !tier.discountPercentage || tier.discountPercentage <= 0) {
    return null;
  }

  // Get discount duration settings from tier (defaults to "forever" for backwards compatibility)
  const duration: "once" | "forever" | "repeating" =
    tier.discountDuration || "forever";
  const durationInMonths =
    duration === "repeating" ? tier.discountDurationMonths || 3 : undefined;

  const result = await createOrGetStripeCoupon(
    tier.discountPercentage,
    duration,
    durationInMonths,
  );
  if (result.success && result.coupon) {
    const durationLabel =
      duration === "once"
        ? "first payment only"
        : duration === "repeating"
          ? `${durationInMonths} months`
          : "forever";

    await logPriceAudit({
      tierId,
      tierName: tier.name,
      action: "coupon_applied",
      localPrice: parseFloat(tier.price),
      stripePrice: null,
      stripePriceId: null,
      couponId: result.coupon.id,
      discountPercent: tier.discountPercentage,
      details: `Applied ${tier.discountPercentage}% discount coupon (${durationLabel})`,
      resolved: true,
    });

    return result.coupon.id;
  }

  return null;
}

/**
 * Calculate the effective price after discount
 * Uses Stripe coupon logic for consistency
 */
export function calculateEffectivePrice(
  basePrice: number,
  discountPercentage: number,
): number {
  if (discountPercentage <= 0 || discountPercentage >= 100) {
    return basePrice;
  }
  return (
    Math.round(((basePrice * (100 - discountPercentage)) / 100) * 100) / 100
  );
}

/**
 * Sync tier prices with Stripe
 * Creates or updates Stripe prices to match local tier prices
 */
export async function syncTierPricesWithStripe(tierId: string): Promise<{
  success: boolean;
  monthlyPriceId?: string;
  annualPriceId?: string;
  couponId?: string | null;
  errors: string[];
}> {
  const errors: string[] = [];

  await connectDB();

  const tier = await Tier.findById(tierId);
  if (!tier) {
    return { success: false, errors: ["Tier not found"] };
  }

  let monthlyPriceId: string | undefined;
  let annualPriceId: string | undefined;

  // Create or validate monthly price
  if (!tier.stripeMonthlyPriceId) {
    const monthlyResult = await createStripePriceForTier(tierId, "month");
    if (monthlyResult.success) {
      monthlyPriceId = monthlyResult.priceId;
    } else {
      errors.push(`Monthly price: ${monthlyResult.error}`);
    }
  } else {
    // Validate existing price
    const validation = await validateTierPrice(tierId, "month");
    if (!validation.valid && validation.stripePrice === null) {
      const monthlyRepair = await createStripePriceForTier(tierId, "month");
      if (monthlyRepair.success) {
        monthlyPriceId = monthlyRepair.priceId;
      } else {
        errors.push(`Monthly price missing/invalid: ${monthlyRepair.error}`);
        monthlyPriceId = tier.stripeMonthlyPriceId;
      }
    } else if (!validation.valid && validation.stripePrice !== null) {
      errors.push(`Monthly price mismatch: ${validation.message}`);
      monthlyPriceId = tier.stripeMonthlyPriceId;
    } else {
      monthlyPriceId = tier.stripeMonthlyPriceId;
    }
  }

  // Create or validate annual price
  if (!tier.stripeAnnualPriceId) {
    const annualResult = await createStripePriceForTier(tierId, "year");
    if (annualResult.success) {
      annualPriceId = annualResult.priceId;
    } else {
      errors.push(`Annual price: ${annualResult.error}`);
    }
  } else {
    // Validate existing price
    const validation = await validateTierPrice(tierId, "year");
    if (!validation.valid && validation.stripePrice === null) {
      const annualRepair = await createStripePriceForTier(tierId, "year");
      if (annualRepair.success) {
        annualPriceId = annualRepair.priceId;
      } else {
        errors.push(`Annual price missing/invalid: ${annualRepair.error}`);
        annualPriceId = tier.stripeAnnualPriceId;
      }
    } else if (!validation.valid && validation.stripePrice !== null) {
      errors.push(`Annual price mismatch: ${validation.message}`);
      annualPriceId = tier.stripeAnnualPriceId;
    } else {
      annualPriceId = tier.stripeAnnualPriceId;
    }
  }

  // Get or create coupon for discount
  const couponId = await getCouponForTierDiscount(tierId);

  return {
    success: errors.length === 0,
    monthlyPriceId,
    annualPriceId,
    couponId,
    errors,
  };
}

/**
 * Get price audit log entries
 */
export async function getPriceAuditLog(options?: {
  tierId?: string;
  action?: PriceAuditEntry["action"];
  onlyUnresolved?: boolean;
  limit?: number;
}): Promise<PriceAuditEntry[]> {
  await connectDB();

  const filter: Record<string, unknown> = {};
  if (options?.tierId) filter.tierId = options.tierId;
  if (options?.action) filter.action = options.action;
  if (options?.onlyUnresolved) filter.resolved = false;

  const entries = await PriceAuditLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(options?.limit || 0)
    .lean();

  return entries.map((e) => ({
    timestamp: e.createdAt,
    tierId: e.tierId,
    tierName: e.tierName,
    action: e.action,
    localPrice: e.localPrice,
    stripePrice: e.stripePrice,
    stripePriceId: e.stripePriceId,
    couponId: e.couponId,
    discountPercent: e.discountPercent,
    details: e.details,
    resolved: e.resolved,
  }));
}

/**
 * Get price sync status summary
 */
export async function getPriceSyncStatus(): Promise<{
  totalTiers: number;
  tiersWithStripePrices: number;
  tiersWithDiscounts: number;
  unresolvedMismatches: number;
  recentAuditEntries: PriceAuditEntry[];
}> {
  await connectDB();

  const tiers = await Tier.find({ isActive: true });

  const tiersWithStripePrices = tiers.filter(
    (t) => t.stripeMonthlyPriceId || t.stripeAnnualPriceId || t.stripePriceId,
  ).length;

  const tiersWithDiscounts = tiers.filter(
    (t) => t.discountPercentage && t.discountPercentage > 0,
  ).length;

  const unresolvedMismatches = await PriceAuditLog.countDocuments({
    action: "mismatch",
    resolved: false,
  });

  const recentAuditEntries = await getPriceAuditLog({ limit: 10 });

  return {
    totalTiers: tiers.length,
    tiersWithStripePrices,
    tiersWithDiscounts,
    unresolvedMismatches,
    recentAuditEntries,
  };
}

/**
 * Notify admin of price sync issues
 */
export async function notifyAdminOfPriceSyncIssues(
  adminUserId: string,
  issues: PriceValidationResult[],
): Promise<void> {
  if (issues.length === 0) return;

  const issueDetails = issues
    .map(
      (i) =>
        `• ${i.tierName}: Local $${i.localPrice} vs Stripe $${i.stripePrice}`,
    )
    .join("\n");

  await sendNotification({
    userId: adminUserId,
    type: "alert",
    title: "Price Sync Alert",
    message: `${issues.length} tier(s) have price mismatches. ${issueDetails.replace(/\n/g, " ")} Please review and sync prices in the admin dashboard.`,
    metadata: {
      issues: issues.map((i) => ({ tierId: i.tierId, tierName: i.tierName })),
    },
  });
}
