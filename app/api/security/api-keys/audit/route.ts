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
import { authOptions } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/security/api-keys/audit
 * Get audit logs for user's API keys
 */
export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user
    const user = await User.findOne({ email: session.user.email }).select(
      "_id apiSettings.zapierApiKeyId",
    );
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = String(user._id);

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const parsedLimit = parseInt(searchParams.get("limit") || "100", 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.max(1, Math.min(parsedLimit, 500))
      : 100;
    const keyId = searchParams.get("keyId");

    // Enforce key ownership for targeted key lookups
    if (keyId) {
      const ownedKeyId = (
        user.apiSettings as { zapierApiKeyId?: string } | undefined
      )?.zapierApiKeyId;
      if (!ownedKeyId || ownedKeyId !== keyId) {
        return NextResponse.json(
          { error: "Forbidden: key does not belong to authenticated user" },
          { status: 403 },
        );
      }
    }

    // Get audit logs
    const logs = keyId
      ? await ApiKeySecurityService.getAuditLogs(keyId, limit)
      : await ApiKeySecurityService.getUserAuditLogs(userId, limit);

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
