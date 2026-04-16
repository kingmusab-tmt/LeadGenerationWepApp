/**
 * Cancellation Analytics API
 * Admin endpoint for viewing churn analytics and cancellation feedback
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { CancellationFeedback } from "@/models/cancellationFeedback";
import connectDB from "@/lib/connectdb";
import { User } from "@/models/userModel";
import {
  badRequest,
  forbidden,
  internalError,
  unauthorized,
} from "@/lib/api/error-handler";

/**
 * Check if user is admin
 */
async function isAdmin(userId: string): Promise<boolean> {
  const user = await User.findById(userId).select("role");
  return user?.role === "admin";
}

/**
 * GET /api/admin/analytics/cancellations
 * Get cancellation analytics (admin only)
 *
 * Query parameters:
 * - startDate?: ISO date string
 * - endDate?: ISO date string
 * - groupBy?: "reason" | "tier" | "month"
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    await connectDB();

    // Check admin access
    if (!(await isAdmin(session.user.id))) {
      return forbidden("Admin access required");
    }

    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const groupBy = searchParams.get("groupBy") || "reason";

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    // Build match stage
    const matchStage: Record<string, unknown> = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate)
        (matchStage.createdAt as Record<string, Date>).$gte = startDate;
      if (endDate)
        (matchStage.createdAt as Record<string, Date>).$lte = endDate;
    }

    let analytics;

    switch (groupBy) {
      case "reason":
        analytics = await CancellationFeedback.getReasonBreakdown(
          startDate,
          endDate,
        );
        break;

      case "tier":
        analytics = await CancellationFeedback.getChurnByTier(
          startDate,
          endDate,
        );
        break;

      case "month":
        analytics = await CancellationFeedback.aggregate([
          ...(Object.keys(matchStage).length > 0
            ? [{ $match: matchStage }]
            : []),
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
              },
              count: { $sum: 1 },
              avgMonthsSubscribed: { $avg: "$monthsSubscribed" },
              reasons: {
                $push: "$reason",
              },
            },
          },
          { $sort: { "_id.year": -1, "_id.month": -1 } },
        ]);
        break;

      default:
        return badRequest(
          "Invalid groupBy parameter. Use: reason, tier, or month",
        );
    }

    // Get total cancellations count
    const totalCount = await CancellationFeedback.countDocuments(matchStage);

    // Get recent feedback samples (for qualitative review)
    const recentFeedback = await CancellationFeedback.find({
      ...matchStage,
      feedbackText: { $exists: true, $ne: "" },
    })
      .select("reason feedbackText tierName monthsSubscribed createdAt")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      success: true,
      analytics: {
        groupBy,
        totalCancellations: totalCount,
        breakdown: analytics,
        recentFeedback,
        dateRange: {
          start: startDate,
          end: endDate,
        },
      },
    });
  } catch (error) {
    console.error("[CancellationAnalytics] GET error:", error);
    return internalError("Failed to get cancellation analytics");
  }
}
