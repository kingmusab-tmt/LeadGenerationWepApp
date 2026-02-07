import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import Call from "@/models/call";
import { NextRequest, NextResponse } from "next/server";
import { PipelineStage } from "mongoose";

/**
 * Buyer Performance Dashboard API
 * GET: Aggregate per-buyer call metrics for the authenticated seller
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "30", 10);
    const industry = searchParams.get("industry") || undefined;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const matchStage: Record<string, any> = {
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

    const buyerPerformance = await Call.aggregate(pipeline);

    // Also get summary totals
    const summary = {
      totalBuyers: buyerPerformance.length,
      totalCalls: buyerPerformance.reduce(
        (sum: number, b: any) => sum + b.totalCalls,
        0,
      ),
      totalAnswered: buyerPerformance.reduce(
        (sum: number, b: any) => sum + b.answeredCalls,
        0,
      ),
      totalMissed: buyerPerformance.reduce(
        (sum: number, b: any) => sum + b.missedCalls,
        0,
      ),
      avgAnswerRate:
        buyerPerformance.length > 0
          ? buyerPerformance.reduce(
              (sum: number, b: any) => sum + b.answerRate,
              0,
            ) / buyerPerformance.length
          : 0,
      avgConversionRate:
        buyerPerformance.length > 0
          ? buyerPerformance.reduce(
              (sum: number, b: any) => sum + b.conversionRate,
              0,
            ) / buyerPerformance.length
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
    return NextResponse.json(
      { error: "Failed to fetch buyer performance" },
      { status: 500 },
    );
  }
}
