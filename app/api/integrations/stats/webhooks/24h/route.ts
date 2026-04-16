/**
 * Webhook Statistics API
 * Get webhook dispatch statistics for last 24 hours
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
 * GET /api/integrations/stats/webhooks/24h
 * Get webhook count for last 24 hours
 */
export async function GET() {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return unauthorized("Authentication required");
    }

    // Get all webhook configs and sum their 24h dispatches
    const configs = await WebhookConfig.find({
      userId: session.user.id,
      isActive: true,
    });

    let totalCount = 0;
    for (const config of configs) {
      totalCount += config.totalDispatched || 0;
    }

    return NextResponse.json({ count: totalCount });
  } catch (error) {
    console.error("Error getting webhook stats:", error);
    return internalError("Failed to get webhook stats");
  }
}
