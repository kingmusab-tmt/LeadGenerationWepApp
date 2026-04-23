// Description: This API route handles the reordering of tiers in bulk.
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/connectdb";
import { Tier } from "@/models/tier";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  badRequest,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

/**
 * Create Stripe coupon for tier discount
 */
async function createStripeCouponForTier(
  tierName: string,
  discountPercentage: number,
  discountDuration: "once" | "forever" | "repeating",
  discountDurationMonths: number,
) {
  try {
    // Skip if no discount
    if (!discountPercentage || discountPercentage <= 0) {
      return { stripeCouponId: null };
    }

    // Create coupon with name as reference
    const couponParams: Stripe.CouponCreateParams = {
      percent_off: discountPercentage,
      duration: discountDuration as "once" | "repeating" | "forever",
      ...(discountDuration === "repeating" && {
        duration_in_months: discountDurationMonths,
      }),
    };

    const coupon = await stripe.coupons.create(couponParams);

    // console.log(`[Tier Admin] Created Stripe coupon for ${tierName}:`, {
    //   couponId: coupon.id,
    //   discountPercentage,
    //   duration: discountDuration,
    //   durationMonths: discountDurationMonths,
    // });

    return { stripeCouponId: coupon.id };
  } catch (error) {
    console.error(
      `[Tier Admin] Error creating Stripe coupon for ${tierName}:`,
      error,
    );
    throw error;
  }
}

/**
 * Create Stripe prices for a tier (monthly and annual)
 */
async function createStripePricesForTier(
  tierName: string,
  monthlyPrice: number,
  annualPrice: number,
) {
  try {
    // Only create prices for paid tiers (not free/trial)
    if (monthlyPrice === 0 || annualPrice === 0) {
      return { stripeMonthlyPriceId: null, stripeAnnualPriceId: null };
    }

    // Create or get product
    const products = await stripe.products.list({ limit: 100 });
    let product = products.data.find((p) => p.name === tierName);

    if (!product) {
      product = await stripe.products.create({
        name: tierName,
        description: `Lead Generation Tier - ${tierName}`,
      });
    }

    // Create monthly price
    const monthlyPriceObj = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(monthlyPrice * 100), // Convert to cents
      currency: "usd",
      recurring: {
        interval: "month",
        interval_count: 1,
      },
    });

    // Create annual price
    const annualPriceObj = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(annualPrice * 100), // Convert to cents
      currency: "usd",
      recurring: {
        interval: "year",
        interval_count: 1,
      },
    });

    // console.log(`[Tier Admin] Created Stripe prices for ${tierName}:`, {
    //   monthlyPriceId: monthlyPriceObj.id,
    //   annualPriceId: annualPriceObj.id,
    // });

    return {
      stripeMonthlyPriceId: monthlyPriceObj.id,
      stripeAnnualPriceId: annualPriceObj.id,
    };
  } catch (error) {
    console.error(
      `[Tier Admin] Error creating Stripe prices for ${tierName}:`,
      error,
    );
    throw error;
  }
}

// GET all tiers
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return unauthorized("Authentication required");
    }

    await dbConnect();
    const tiers = await Tier.find().sort({ order: 1 }).lean();
    return NextResponse.json(tiers);
  } catch (error) {
    console.error("Error fetching tiers:", error);
    return internalError("Failed to fetch tiers");
  }
}

// Create new tier
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return unauthorized("Authentication required");
    }

    const data = await req.json();
    await dbConnect();

    // Validate required fields
    if (!data.name || !data.price || !data.description) {
      return badRequest("Missing required fields");
    }

    // Set default order if not provided
    if (!data.order) {
      const count = await Tier.countDocuments();
      data.order = count + 1;
    }

    // Set default tierLimits if not provided
    if (!data.tierLimits) {
      data.tierLimits = {
        leads: 0,
        twilioNumbers: 0,
        numbers: 0,
        callSeconds: 0,
        forms: 0,
        buyers: 0,
        exports: false,
        imports: false,
        liveSupport: false,
        industries: 0,
      };
    }

    // Create Stripe prices if this is a paid tier
    if (data.price !== "0") {
      const monthlyPrice = parseFloat(data.price || "0");
      const annualPrice = parseFloat(data.annualPrice || "0");

      const stripePrices = await createStripePricesForTier(
        data.name,
        monthlyPrice,
        annualPrice,
      );

      data.stripeMonthlyPriceId = stripePrices.stripeMonthlyPriceId;
      data.stripeAnnualPriceId = stripePrices.stripeAnnualPriceId;

      // Create Stripe coupon if discount exists
      if (data.discountPercentage && data.discountPercentage > 0) {
        const stripeCoupon = await createStripeCouponForTier(
          data.name,
          data.discountPercentage,
          data.discountDuration || "forever",
          data.discountDurationMonths || 3,
        );

        data.stripeCouponId = stripeCoupon.stripeCouponId;
      }
    }

    // Create the tier
    const tier = await Tier.create(data);
    return NextResponse.json(tier, { status: 201 });
  } catch (error) {
    console.error("Error creating tier:", error);
    return internalError("Failed to create tier");
  }
}

// Update tier
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return unauthorized("Authentication required");
    }

    const updateData = await req.json();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return badRequest("Missing ID");
    }

    await dbConnect();

    // Get the existing tier first
    const existingTier = await Tier.findById(id);
    if (!existingTier) {
      return notFound("Tier");
    }

    // Create Stripe prices if missing and tier is paid
    if (
      updateData.price !== "0" &&
      (!existingTier.stripeMonthlyPriceId || !existingTier.stripeAnnualPriceId)
    ) {
      const monthlyPrice = parseFloat(
        updateData.price || existingTier.price || "0",
      );
      const annualPrice = parseFloat(
        updateData.annualPrice || existingTier.annualPrice || "0",
      );

      if (monthlyPrice > 0 && annualPrice > 0) {
        const stripePrices = await createStripePricesForTier(
          updateData.name || existingTier.name,
          monthlyPrice,
          annualPrice,
        );

        updateData.stripeMonthlyPriceId = stripePrices.stripeMonthlyPriceId;
        updateData.stripeAnnualPriceId = stripePrices.stripeAnnualPriceId;
      }
    }

    // Create Stripe coupon if missing and tier has discount
    const discountPercentage =
      updateData.discountPercentage !== undefined
        ? updateData.discountPercentage
        : existingTier.discountPercentage;
    const discountDuration =
      updateData.discountDuration !== undefined
        ? updateData.discountDuration
        : existingTier.discountDuration;
    const discountDurationMonths =
      updateData.discountDurationMonths !== undefined
        ? updateData.discountDurationMonths
        : existingTier.discountDurationMonths;

    if (
      discountPercentage &&
      discountPercentage > 0 &&
      !existingTier.stripeCouponId
    ) {
      const coupon = await createStripeCouponForTier(
        updateData.name || existingTier.name,
        discountPercentage,
        discountDuration,
        discountDurationMonths,
      );

      updateData.stripeCouponId = coupon.stripeCouponId;
    }

    // Update the tier
    const updatedTier = await Tier.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedTier) {
      return notFound("Tier");
    }

    return NextResponse.json(updatedTier);
  } catch (error) {
    console.error("Error updating tier:", error);
    return internalError("Failed to update tier");
  }
}

// Delete tier
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return unauthorized("Authentication required");
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return badRequest("Missing ID");
    }

    await dbConnect();

    const deletedTier = await Tier.findByIdAndDelete(id);

    if (!deletedTier) {
      return notFound("Tier");
    }

    // Reorder remaining tiers
    const remainingTiers = await Tier.find().sort({ order: 1 });
    for (let i = 0; i < remainingTiers.length; i++) {
      await Tier.findByIdAndUpdate(remainingTiers[i]._id, { order: i + 1 });
    }

    return NextResponse.json({ message: "Tier deleted successfully" });
  } catch (error) {
    console.error("Error deleting tier:", error);
    return internalError("Failed to delete tier");
  }
}
