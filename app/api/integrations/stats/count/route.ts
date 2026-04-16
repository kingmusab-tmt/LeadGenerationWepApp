/**
 * Integration Statistics API
 * Provides metrics and stats for integrations dashboard
 *
 * Date: January 21, 2026
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import WebhookConfig from "@/models/webhookConfig";
import { internalError, unauthorized } from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/stats/count
 * Get count of active integrations
 */
export async function GET() {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return unauthorized("Authentication required");
    }

    const count = await WebhookConfig.countDocuments({
      userId: session.user.id,
      isActive: true,
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error getting integration count:", error);
    return internalError("Failed to get integration count");
  }
}
