import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { ZodError } from "zod";
import { mongoIdParamSchema } from "@/lib/validation/schemas";
import {
  successResponse,
  unauthorized,
  forbidden,
  badRequest,
  notFound,
  internalError,
  handleValidationError,
} from "@/lib/api/error-handler";

/**
 * GET /api/subscriptions/limits?sellerId=<id>
 * Get subscription limits for a seller
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Authentication required");
    }

    // Validate sellerId parameter
    const { searchParams } = new URL(req.url);
    const sellerId = searchParams.get("sellerId");

    if (!sellerId) {
      return badRequest("Seller ID is required");
    }

    // Validate sellerId format
    try {
      mongoIdParamSchema.parse(sellerId);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid seller ID format");
    }

    // Authorization check
    if (
      session.user.id !== sellerId &&
      session.user.role !== "admin" &&
      session.user.role !== "business-admin"
    ) {
      return forbidden("You can only access your own data");
    }

    await dbConnect();

    // Find user with subscription data
    const user = await User.findById(sellerId)
      .select("subscription buyers")
      .lean();

    if (!user) {
      return notFound("User not found");
    }

    // Calculate current buyer count
    const buyerCount = user.buyers?.length || 0;

    // Prepare response
    return successResponse({
      currentCount: buyerCount,
      subscriptionLimits: user.subscription?.subscriptionLimits || {
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
      },
      tierId: user.subscription?.subscriptionTierId || null,
    });
  } catch (error) {
    console.error("[GET /api/subscriptions/limits]", error);
    return internalError("Failed to get subscription limits");
  }
}
