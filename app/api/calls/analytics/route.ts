import dbConnect from "@/lib/connectdb";
import Call from "@/models/call";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { PipelineStage } from "mongoose";
import {
  successResponse,
  unauthorized,
  internalError,
} from "@/lib/api/error-handler";

type SummaryFacetRow = {
  totalCalls: number;
  completedCalls: number;
  noAnswerCalls: number;
  failedCalls: number;
  forwardedCalls: number;
  totalUnitsCharged: number;
  refundedCalls: number;
  pendingRefundCalls: number;
  durationSum: number;
  durationCount: number;
};

type BucketRow = { _id: string | number; count: number };

type RecentActivityRow = {
  _id: unknown;
  from: string;
  to: string;
  status: string;
  callDuration?: number;
  industry?: string;
  createdAt: Date;
  unitsCharged?: number;
  paymentStatus?: string;
};

export async function GET() {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return unauthorized("Please log in.");
    }
    const sellerId = session.user.id;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // A single $facet aggregation replaces the previous approach of loading
    // every call the seller has ever received into Node memory and
    // filtering/reducing it in JavaScript — that doesn't scale past a few
    // thousand calls and re-runs on every Overview-tab load.
    const pipeline: PipelineStage[] = [
      { $match: { userId: sellerId } },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalCalls: { $sum: 1 },
                completedCalls: {
                  $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
                },
                noAnswerCalls: {
                  $sum: { $cond: [{ $eq: ["$status", "no-answer"] }, 1, 0] },
                },
                failedCalls: {
                  $sum: {
                    $cond: [
                      {
                        $in: [
                          "$status",
                          ["failed", "insufficient_balance"],
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                forwardedCalls: {
                  $sum: { $cond: [{ $eq: ["$status", "forwarded"] }, 1, 0] },
                },
                totalUnitsCharged: { $sum: { $ifNull: ["$unitsCharged", 0] } },
                refundedCalls: {
                  $sum: {
                    $cond: [{ $eq: ["$paymentStatus", "refunded"] }, 1, 0],
                  },
                },
                pendingRefundCalls: {
                  $sum: {
                    $cond: [
                      { $eq: ["$paymentStatus", "pending_refund"] },
                      1,
                      0,
                    ],
                  },
                },
                durationSum: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$status", "completed"] },
                          { $gt: [{ $ifNull: ["$callDuration", 0] }, 0] },
                        ],
                      },
                      "$callDuration",
                      0,
                    ],
                  },
                },
                durationCount: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$status", "completed"] },
                          { $gt: [{ $ifNull: ["$callDuration", 0] }, 0] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          dailyData: [
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                count: { $sum: 1 },
              },
            },
          ],
          callsByStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } },
          ],
          callsByIndustry: [
            {
              $group: {
                _id: { $ifNull: ["$industry", "Unknown"] },
                count: { $sum: 1 },
              },
            },
          ],
          recentActivity: [
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $project: {
                _id: 1,
                from: 1,
                to: 1,
                status: 1,
                callDuration: 1,
                industry: 1,
                createdAt: 1,
                unitsCharged: 1,
                paymentStatus: 1,
              },
            },
          ],
          peakHour: [
            {
              $group: {
                _id: { $hour: "$createdAt" },
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 1 },
          ],
        },
      },
    ];

    const [result] = await Call.aggregate<{
      summary: SummaryFacetRow[];
      dailyData: BucketRow[];
      callsByStatus: BucketRow[];
      callsByIndustry: BucketRow[];
      recentActivity: RecentActivityRow[];
      peakHour: BucketRow[];
    }>(pipeline);

    const summaryRow = result?.summary?.[0];
    const totalCalls = summaryRow?.totalCalls ?? 0;
    const completedCalls = summaryRow?.completedCalls ?? 0;
    const durationSum = summaryRow?.durationSum ?? 0;
    const durationCount = summaryRow?.durationCount ?? 0;
    const totalUnitsCharged = summaryRow?.totalUnitsCharged ?? 0;

    // Fill in missing days so the chart always shows a full 30-day window
    const dailyByDate = new Map(
      (result?.dailyData ?? []).map((d) => [String(d._id), d.count]),
    );
    const dailyData: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dailyData.push({ date: key, count: dailyByDate.get(key) || 0 });
    }

    const callsByStatus: Record<string, number> = {};
    for (const row of result?.callsByStatus ?? []) {
      callsByStatus[String(row._id)] = row.count;
    }

    const callsByIndustry: Record<string, number> = {};
    for (const row of result?.callsByIndustry ?? []) {
      callsByIndustry[String(row._id)] = row.count;
    }

    const peakHourRow = result?.peakHour?.[0];

    return successResponse({
      summary: {
        totalCalls,
        completedCalls,
        noAnswerCalls: summaryRow?.noAnswerCalls ?? 0,
        failedCalls: summaryRow?.failedCalls ?? 0,
        forwardedCalls: summaryRow?.forwardedCalls ?? 0,
        answerRate:
          totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0,
        avgDuration:
          durationCount > 0 ? Math.round(durationSum / durationCount) : 0,
        totalUnitsCharged,
        totalRevenue: totalUnitsCharged,
        refundedCalls: summaryRow?.refundedCalls ?? 0,
        pendingRefundCalls: summaryRow?.pendingRefundCalls ?? 0,
        peakHour: peakHourRow
          ? { hour: Number(peakHourRow._id), count: peakHourRow.count }
          : null,
      },
      dailyData,
      callsByStatus,
      callsByIndustry,
      recentActivity: (result?.recentActivity ?? []).map((c) => ({
        _id: c._id,
        from: c.from,
        to: c.to,
        status: c.status,
        callDuration: c.callDuration,
        industry: c.industry,
        createdAt: c.createdAt,
        unitsCharged: c.unitsCharged,
        paymentStatus: c.paymentStatus,
      })),
    });
  } catch (error) {
    console.error("Error fetching call analytics:", error);
    return internalError("Failed to fetch call analytics");
  }
}
