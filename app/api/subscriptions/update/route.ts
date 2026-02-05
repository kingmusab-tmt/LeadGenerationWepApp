import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { Tier } from "@/models/tier";
import { z, ZodError } from "zod";
import {
  successResponse,
  unauthorized,
  badRequest,
  notFound,
  conflict,
  internalError,
  handleValidationError,
} from "@/lib/api/error-handler";
import {
  invalidateSessionCache,
  invalidateAllUserSessions,
} from "@/lib/cachedSession";

// Validation schema for subscription update
const createSubscriptionSchema = z.object({
  tierId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid tier ID format"),
  planName: z.string().min(1, "Plan name is required"),
  price: z.number().min(0, "Price must be >= 0").optional(),
  tierType: z.enum(["free", "paid"], {
    message: "Tier type must be 'free' or 'paid'",
  }),
  subscriptionYears: z
    .number()
    .min(1, "Subscription years must be >= 1")
    .default(1),
});

/**
 * POST /api/subscriptions/update
 * Update user subscription with new tier
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return badRequest("Invalid JSON in request body");
    }

    let validatedData;
    try {
      validatedData = await createSubscriptionSchema.parseAsync(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid subscription data");
    }

    // Validate price requirement for paid tiers
    if (validatedData.tierType === "paid" && !validatedData.price) {
      return badRequest("Price is required for paid tier subscriptions");
    }

    await dbConnect();

    // Get the current user to check existing subscription status
    const currentUser = await User.findById(session.user.id).select(
      "subscription",
    );
    if (!currentUser) {
      return notFound("User not found");
    }

    // Check if user is trying to use free trial but has already used it
    if (validatedData.tierType === "free") {
      const hasUsedTrial = currentUser.subscription?.usedTrial === true;
      if (hasUsedTrial) {
        return conflict(
          "You have already used your free trial. Please choose a paid subscription to continue.",
        );
      }
    }

    // Get the tier details to access the limits
    const tier = await Tier.findById(validatedData.tierId).lean();
    if (!tier) {
      return notFound("Tier not found");
    }

    // Calculate subscription dates
    const startDate = new Date();
    const expiryDate = new Date(startDate);

    if (validatedData.tierType === "free") {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else {
      expiryDate.setFullYear(
        expiryDate.getFullYear() + validatedData.subscriptionYears,
      );
    }

    // Prepare subscription update data
    const subscriptionUpdate = {
      "subscription.subscriptionPlan": validatedData.planName,
      "subscription.subscriptionStartDate": startDate,
      "subscription.subscriptionExpiryDate": expiryDate,
      "subscription.isSubscriptionActive": true,
      "subscription.isTrial": validatedData.tierType === "free",
      "subscription.usedTrial":
        validatedData.tierType === "free"
          ? true
          : currentUser.subscription?.usedTrial || false,
      "subscription.subscriptionPaymentMethod":
        validatedData.tierType === "free" ? "free" : "paid",
      "subscription.subscriptionTierId": validatedData.tierId,
      "subscription.subscriptionTierType": validatedData.tierType,
      "subscription.subscriptionPrice": validatedData.price || 0,
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
        leads: 0,
        callSeconds: 0,
      },
    };

    // Update user's subscription
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { $set: subscriptionUpdate },
      { new: true },
    ).select("subscription");

    if (!updatedUser) {
      return notFound("User not found after update");
    }

    // Invalidate session cache so the new subscription is fetched on next request
    await invalidateSessionCache(session.user.email);
    // Also invalidate all sessions for this user ID
    await invalidateAllUserSessions(session.user.id);

    return successResponse({
      success: true,
      subscription: updatedUser.subscription,
    });
  } catch (error) {
    console.error("[POST /api/subscriptions/update]", error);
    return internalError("Failed to update subscription");
  }
}
