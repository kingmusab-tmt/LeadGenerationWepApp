/**
 * Usage Tracking API
 * Provides current usage, warnings, and limit enforcement
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import connectDB from "@/lib/connectdb";
import { User } from "@/models/userModel";
import {
  getUsageSummary,
  getUsageWarnings,
  canPerformAction,
  checkAndIncrementUsage,
  USAGE_TO_LIMIT_MAP,
} from "@/lib/subscriptionLimitsService";

/**
 * GET /api/subscriptions/usage
 * Get current usage summary, limits, and warnings
 *
 * Query params:
 * - includeWarnings: "true" to include threshold warnings
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const includeWarnings = searchParams.get("includeWarnings") === "true";

    // Get usage summary
    const summary = await getUsageSummary(session.user.id);

    // Get warnings if requested
    let warnings: Awaited<ReturnType<typeof getUsageWarnings>> = [];
    if (includeWarnings) {
      warnings = await getUsageWarnings(session.user.id);
    }

    return NextResponse.json({
      success: true,
      usage: summary.usage,
      limits: summary.limits,
      percentages: summary.percentages,
      warnings,
    });
  } catch (error) {
    console.error("[UsageAPI] GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to get usage data" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/subscriptions/usage
 * Check if action is allowed and optionally increment usage
 *
 * Request body:
 * {
 *   action: "check" | "increment",
 *   usageKey: string (e.g., "leads", "forms", "smsCampaigns"),
 *   amount?: number (default: 1),
 *   enforceSoftLimit?: boolean (default: false)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      action = "check",
      usageKey,
      amount = 1,
      enforceSoftLimit = false,
    } = body;

    if (!usageKey) {
      return NextResponse.json(
        { success: false, message: "usageKey is required" },
        { status: 400 },
      );
    }

    // Validate usage key
    if (!USAGE_TO_LIMIT_MAP[usageKey]) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid usageKey. Valid keys: ${Object.keys(USAGE_TO_LIMIT_MAP).join(", ")}`,
        },
        { status: 400 },
      );
    }

    await connectDB();

    if (action === "check") {
      // Pre-flight check without incrementing
      const result = await canPerformAction(session.user.id, usageKey, amount);

      return NextResponse.json({
        success: true,
        allowed: result.allowed,
        currentUsage: result.currentUsage,
        limit: result.limit,
        percentage: result.percentage,
        isWarning: result.isWarning,
        isSoftLimit: result.isSoftLimit,
        message: result.message,
      });
    } else if (action === "increment") {
      // Check and increment with notifications
      const result = await checkAndIncrementUsage(
        session.user.id,
        usageKey,
        amount,
        {
          sendNotifications: true,
          enforceSoftLimit,
        },
      );

      if (!result.allowed) {
        return NextResponse.json(
          {
            success: false,
            allowed: result.allowed,
            currentUsage: result.currentUsage,
            limit: result.limit,
            percentage: result.percentage,
            message: result.message,
          },
          { status: 403 },
        );
      }

      return NextResponse.json({
        success: true,
        allowed: result.allowed,
        currentUsage: result.currentUsage,
        limit: result.limit,
        percentage: result.percentage,
        notificationSent: result.notificationSent,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid action. Use 'check' or 'increment'",
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("[UsageAPI] POST error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process usage request" },
      { status: 500 },
    );
  }
}
