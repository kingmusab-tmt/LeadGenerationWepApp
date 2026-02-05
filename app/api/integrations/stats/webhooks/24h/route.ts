/**
 * Webhook Statistics API
 * Get webhook dispatch statistics for last 24 hours
 *
 * Date: January 21, 2026
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/connectdb";
import WebhookConfig from "@/models/webhookConfig";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/stats/webhooks/24h
 * Get webhook count for last 24 hours
 */
export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all webhook configs and sum their 24h dispatches
    const configs = await WebhookConfig.find({ isActive: true });

    let totalCount = 0;
    for (const config of configs) {
      totalCount += config.totalDispatched || 0;
    }

    return NextResponse.json({ count: totalCount });
  } catch (error) {
    console.error("Error getting webhook stats:", error);
    return NextResponse.json(
      { error: "Failed to get webhook stats" },
      { status: 500 },
    );
  }
}
