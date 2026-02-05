/**
 * Integration Statistics API
 * Provides metrics and stats for integrations dashboard
 *
 * Date: January 21, 2026
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/connectdb";
import WebhookConfig from "@/models/webhookConfig";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/stats/count
 * Get count of active integrations
 */
export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const count = await WebhookConfig.countDocuments({
      isActive: true,
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error getting integration count:", error);
    return NextResponse.json(
      { error: "Failed to get integration count" },
      { status: 500 },
    );
  }
}
