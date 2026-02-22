import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { Tier } from "@/models/tier";
import {
  successResponse,
  unauthorized,
  forbidden,
  internalError,
} from "@/lib/api/error-handler";

/**
 * POST /api/admin/migrate-email-campaigns
 * Enables emailCampaignsEnabled for all existing users and tiers
 * Admin only endpoint
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Authentication required");
    }

    // Only allow admin users to run migration
    if (session.user.role !== "admin") {
      return forbidden("Admin access required");
    }

    await dbConnect();

    // Update all users to have emailCampaignsEnabled: true
    const userResult = await User.updateMany(
      {}, // Match all users
      {
        $set: {
          "subscription.subscriptionLimits.emailCampaignsEnabled": true,
        },
      },
    );

    // Update all tiers to have emailCampaignsEnabled: true
    const tierResult = await Tier.updateMany(
      {}, // Match all tiers
      {
        $set: {
          "tierLimits.emailCampaignsEnabled": true,
        },
      },
    );

    return successResponse({
      message: "Email campaigns feature enabled for all users and tiers",
      users: {
        modifiedCount: userResult.modifiedCount,
        matchedCount: userResult.matchedCount,
      },
      tiers: {
        modifiedCount: tierResult.modifiedCount,
        matchedCount: tierResult.matchedCount,
      },
    });
  } catch (error) {
    console.error("[POST /api/admin/migrate-email-campaigns]", error);
    return internalError("Failed to enable email campaigns");
  }
}
