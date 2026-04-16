/**
 * API Calls Statistics
 * Track API call count for last 24 hours
 *
 * Date: January 21, 2026
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { internalError, unauthorized } from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/stats/api-calls/24h
 * Get API call count for last 24 hours
 */
export async function GET() {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return unauthorized("Authentication required");
    }

    // TODO: Implement actual API call tracking
    // For now, return a placeholder value
    // This should track calls to /api/integrations/zapier/actions
    const count = 0;

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error getting API call stats:", error);
    return internalError("Failed to get API call stats");
  }
}
