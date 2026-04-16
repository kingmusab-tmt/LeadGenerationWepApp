import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import Call from "@/models/call";
import { NextRequest, NextResponse } from "next/server";
import { PipelineStage } from "mongoose";
import {
  badRequest,
  forbidden,
  internalError,
  unauthorized,
} from "@/lib/api/error-handler";

type BuyerPerformanceRow = {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  answerRate: number;
  conversionRate: number;
};

/**
 * Buyer Performance Dashboard API
 * GET: Aggregate per-buyer call metrics for the authenticated seller
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    if (session.user.role !== "seller" && session.user.role !== "admin") {
      return forbidden("Seller or admin access required");
    }

    const searchParams = req.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "30", 10);
    const industry = searchParams.get("industry") || undefined;

    if (Number.isNaN(days) || days < 1 || days > 365) {
      return badRequest("days must be an integer between 1 and 365");
    }

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const matchStage: Record<string, unknown> = {
      userId: session.user.id,
      createdAt: { $gte: dateFrom },
      buyerId: { $exists: true, $ne: null },
    };
    if (industry) {
      matchStage.industry = industry;
    }

    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      {
        $group: {
          _id: "$buyerId",
          totalCalls: { $sum: 1 },
          answeredCalls: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          missedCalls: {
            $sum: { $cond: [{ $eq: ["$status", "no-answer"] }, 1, 0] },
          },
          totalDuration: { $sum: { $ifNull: ["$callDuration", 0] } },
          avgDuration: { $avg: { $ifNull: ["$callDuration", 0] } },
          totalUnitsCharged: { $sum: { $ifNull: ["$unitsCharged", 0] } },
          // Disposition breakdown
          qualifiedLeads: {
            $sum: {
              $cond: [{ $eq: ["$disposition", "qualified_lead"] }, 1, 0],
            },
          },
          soldLeads: {
            $sum: { $cond: [{ $eq: ["$disposition", "sold"] }, 1, 0] },
          },
          notInterested: {
            $sum: {
              $cond: [{ $eq: ["$disposition", "not_interested"] }, 1, 0],
            },
          },
          wrongNumbers: {
            $sum: {
              $cond: [{ $eq: ["$disposition", "wrong_number"] }, 1, 0],
            },
          },
          callbackRequested: {
            $sum: {
              $cond: [{ $eq: ["$disposition", "callback_requested"] }, 1, 0],
            },
          },
          spamCalls: {
            $sum: { $cond: [{ $eq: ["$disposition", "spam"] }, 1, 0] },
          },
          // AI sentiment breakdown
          positiveSentiment: {
            $sum: {
              $cond: [{ $eq: ["$aiSentiment", "positive"] }, 1, 0],
            },
          },
          neutralSentiment: {
            $sum: {
              $cond: [{ $eq: ["$aiSentiment", "neutral"] }, 1, 0],
            },
          },
          negativeSentiment: {
            $sum: {
              $cond: [{ $eq: ["$aiSentiment", "negative"] }, 1, 0],
            },
          },
          // AI lead score breakdown
          gradeA: {
            $sum: { $cond: [{ $eq: ["$aiLeadScore", "A"] }, 1, 0] },
          },
          gradeB: {
            $sum: { $cond: [{ $eq: ["$aiLeadScore", "B"] }, 1, 0] },
          },
          gradeC: {
            $sum: { $cond: [{ $eq: ["$aiLeadScore", "C"] }, 1, 0] },
          },
          gradeD: {
            $sum: { $cond: [{ $eq: ["$aiLeadScore", "D"] }, 1, 0] },
          },
          lastCallDate: { $max: "$createdAt" },
        },
      },
      {
        $lookup: {
          from: "leadbuyers",
          let: { buyerId: { $toObjectId: "$_id" } },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$buyerId"] } } },
            {
              $project: {
                company: 1,
                firstName: 1,
                lastName: 1,
                phone: 1,
                email: 1,
              },
            },
          ],
          as: "buyerInfo",
        },
      },
      { $unwind: { path: "$buyerInfo", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          answerRate: {
            $cond: [
              { $gt: ["$totalCalls", 0] },
              {
                $multiply: [
                  { $divide: ["$answeredCalls", "$totalCalls"] },
                  100,
                ],
              },
              0,
            ],
          },
          conversionRate: {
            $cond: [
              { $gt: ["$answeredCalls", 0] },
              {
                $multiply: [
                  {
                    $divide: [
                      { $add: ["$qualifiedLeads", "$soldLeads"] },
                      "$answeredCalls",
                    ],
                  },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { totalCalls: -1 } },
    ];

    const buyerPerformance =
      await Call.aggregate<BuyerPerformanceRow>(pipeline);

    // Also get summary totals
    const summary = {
      totalBuyers: buyerPerformance.length,
      totalCalls: buyerPerformance.reduce((sum, b) => sum + b.totalCalls, 0),
      totalAnswered: buyerPerformance.reduce(
        (sum, b) => sum + b.answeredCalls,
        0,
      ),
      totalMissed: buyerPerformance.reduce((sum, b) => sum + b.missedCalls, 0),
      avgAnswerRate:
        buyerPerformance.length > 0
          ? buyerPerformance.reduce((sum, b) => sum + b.answerRate, 0) /
            buyerPerformance.length
          : 0,
      avgConversionRate:
        buyerPerformance.length > 0
          ? buyerPerformance.reduce((sum, b) => sum + b.conversionRate, 0) /
            buyerPerformance.length
          : 0,
    };

    return NextResponse.json({
      success: true,
      buyers: buyerPerformance,
      summary,
      period: { days, from: dateFrom.toISOString() },
    });
  } catch (error) {
    console.error("Error fetching buyer performance:", error);
    return internalError("Failed to fetch buyer performance");
  }
}
