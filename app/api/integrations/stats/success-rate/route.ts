/**
 * Success Rate Statistics API
 * Calculate webhook success rate
 *
 * Date: January 21, 2026
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/connectdb";
import WebhookConfig from "@/models/webhookConfig";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/stats/success-rate
 * Get webhook success rate
 */
export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all webhook configs and calculate success rate
    const configs = await WebhookConfig.find({ isActive: true });

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
    return NextResponse.json(
      { error: "Failed to get success rate" },
      { status: 500 },
    );
  }
}
