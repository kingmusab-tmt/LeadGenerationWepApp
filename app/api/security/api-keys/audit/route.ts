/**
 * API Key Security Audit Dashboard Endpoint
 * View audit logs and security events for API keys
 *
 * Date: January 21, 2026
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/userModel";
import { ApiKeySecurityService } from "@/lib/security/apiKeySecurityService";

export const dynamic = "force-dynamic";

/**
 * GET /api/security/api-keys/audit
 * Get audit logs for user's API keys
 */
export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = (user._id as any).toString();

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const keyId = searchParams.get("keyId");

    // Get audit logs
    let logs;
    if (keyId) {
      logs = await ApiKeySecurityService.getAuditLogs(keyId, limit);
    } else {
      logs = await ApiKeySecurityService.getUserAuditLogs(userId, limit);
    }

    // Get key statistics
    const stats = {
      totalEvents: logs.length,
      successfulEvents: logs.filter((log) => log.success).length,
      failedEvents: logs.filter((log) => !log.success).length,
      uniqueKeys: new Set(logs.map((log) => log.keyId)).size,
      recentActivity: logs.slice(0, 10),
    };

    return NextResponse.json({
      success: true,
      logs,
      stats,
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 },
    );
  }
}
