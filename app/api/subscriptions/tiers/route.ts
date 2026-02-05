import { NextRequest } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Tier } from "@/models/tier";
import { ZodError } from "zod";
import { mongoIdParamSchema } from "@/lib/validation/schemas";
import {
  successResponse,
  badRequest,
  notFound,
  internalError,
  handleValidationError,
} from "@/lib/api/error-handler";

/**
 * GET /api/subscriptions/tiers?tierId=<id>
 * Get tier details by ID
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tierId = searchParams.get("tierId");

    // Validate tierId parameter
    if (!tierId) {
      return badRequest("Tier ID is required");
    }

    // Validate tierId format
    try {
      mongoIdParamSchema.parse(tierId);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid Tier ID format");
    }

    await dbConnect();

    // Find the tier in database
    const tier = await Tier.findOne({
      _id: tierId,
      isActive: true,
    }).lean();

    if (!tier) {
      return notFound("Tier not found or not available");
    }

    // Return the tier data
    return successResponse({
      _id: tier._id.toString(),
      name: tier.name,
      price: tier.price,
      description: tier.description,
      features: tier.features,
      ctaText: tier.ctaText,
      highlight: tier.highlight,
      isActive: tier.isActive,
      tierType: tier.tierType,
      tierUserType: tier.tierUserType,
      discountPercentage: tier.discountPercentage,
      discountedPrice: tier.discountedPrice,
      renewalPrice: tier.renewalPrice,
      annualPrice: tier.annualPrice,
    });
  } catch (error) {
    console.error("[GET /api/subscriptions/tiers]", error);
    return internalError("Failed to fetch tier");
  }
}
