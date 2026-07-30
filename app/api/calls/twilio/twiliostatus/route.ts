import { NextRequest } from "next/server";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  successResponse,
  unauthorized,
} from "@/lib/api/error-handler";

import { isSellerRole } from "@/lib/roles";
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Unauthorized - Please log in");
    }

    const { searchParams } = new URL(req.url);
    const sellerId = searchParams.get("sellerId");

    // Validate sellerId parameter
    if (!sellerId) {
      return badRequest("Seller ID is required");
    }

    // Authorization check: seller can access own data, admin can access any seller.
    const isAdmin = session.user.role === "admin";
    const isOwnSeller =
      isSellerRole(session.user.role) && session.user.id === sellerId;
    if (!isAdmin && !isOwnSeller) {
      return forbidden("Forbidden - You can only access your own data");
    }

    // Connect to database
    await dbConnect();

    // Find user with subscription data
    const user = await User.findOne(
      { _id: sellerId },
      {
        twilioActivated: 1,
        "subscription.subscriptionLimits": 1,
        "subscription.subscriptionTierId": 1,
        trackingNumbers: 1,
      },
    ).lean();

    if (!user) {
      return notFound("Seller");
    }

    // Prepare response data
    const responseData = {
      twilioActivated: user.twilioActivated || false,
      currentCount: Array.isArray(user.trackingNumbers)
        ? user.trackingNumbers.length
        : 0,
      subscriptionLimits: user.subscription?.subscriptionLimits || {
        twilioNumbers: 0,
      },
      tierId: user.subscription?.subscriptionTierId || null,
    };

    return successResponse(responseData);
  } catch (error) {
    console.error("Error in GET /api/calls/twilio/twiliostatus:", error);

    // Don't expose internal errors to client
    return internalError("An internal server error occurred");
  }
}
// This code handles the GET request to check the Twilio activation status for a seller.
// It connects to the database, retrieves the seller's Twilio activation status,
