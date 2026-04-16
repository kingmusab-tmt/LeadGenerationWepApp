/**
 * Success Rate Statistics API
 * Calculate webhook success rate
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
 * GET /api/integrations/stats/success-rate
 * Get webhook success rate
 */
export async function GET() {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return unauthorized("Authentication required");
    }

    // Get all webhook configs and calculate success rate
    const configs = await WebhookConfig.find({
      userId: session.user.id,
      isActive: true,
    });

    let totalSuccessful = 0;
    let totalDispatches = 0;

    for (const config of configs) {
      totalSuccessful += config.successCount || 0;
      totalDispatches += config.totalDispatched || 0;
    }

    const rate =
      totalDispatches > 0
        ? Math.round((totalSuccessful / totalDispatches) * 100) + "%"
        : "0%";

    return NextResponse.json({ rate });
  } catch (error) {
    console.error("Error getting success rate:", error);
    return internalError("Failed to get success rate");
  }
}
