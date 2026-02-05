/**
 * API Calls Statistics
 * Track API call count for last 24 hours
 *
 * Date: January 21, 2026
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/connectdb";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/stats/api-calls/24h
 * Get API call count for last 24 hours
 */
export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Implement actual API call tracking
    // For now, return a placeholder value
    // This should track calls to /api/integrations/zapier/actions
    const count = 0;

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error getting API call stats:", error);
    return NextResponse.json(
      { error: "Failed to get API call stats" },
      { status: 500 },
    );
  }
}
