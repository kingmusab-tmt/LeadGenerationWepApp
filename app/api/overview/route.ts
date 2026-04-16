import { NextRequest } from "next/server";
import { User } from "@/models";
import { Campaign } from "../../../models/campaign";
import { Lead } from "@/models/leads";
import { Buyer } from "@/models/leadbuyers";
import { Transaction } from "@/models/transactions";
import dbConnect from "@/lib/connectdb";
import Call from "@/models/call";
import mongoose from "mongoose";
import { withAuth } from "@/lib/api/async-handler";
import { ApiError, ErrorCode, successResponse } from "@/lib/api/error-handler";

export const GET = withAuth(async (req: NextRequest, session) => {
  // Connect to MongoDB
  await dbConnect();

  const userId = session.user.id;
  if (!userId) {
    throw new ApiError(401, ErrorCode.UNAUTHORIZED, "Authentication required");
  }
  //("User ID:", userId);

  // Get current date and previous periods for trend calculations
  const currentDate = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(currentDate.getMonth() - 1);
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(currentDate.getMonth() - 2);
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(currentDate.getMonth() - 12);

  // ──────────────────────────────────────────────────────
  // Run ALL independent MongoDB queries in parallel
  // ──────────────────────────────────────────────────────
  const userObjId = new mongoose.Types.ObjectId(userId);
  const transactionUserMatch = { $in: [userObjId, userId] };
  const sellerIncomeTypes = ["seller_income", "seller_income_auto_accept"];

  const [
    totalLeads,
    totalUsers,
    activeCampaigns,
    leadStatus,
    revenueData,
    campaignPerformance,
    buyerData,
    buyerCreditSummary,
    leadTrends,
    revenueTrend,
    leadSources,
    recentActivities,
    currentPeriodLeads,
    previousPeriodLeads,
    currentPeriodRevenue,
    previousPeriodRevenue,
    callMetrics,
    leadQualityMetrics,
    topPerformingCampaigns,
    dailySales,
    weeklySales,
  ] = await Promise.all([
    // 1. BASIC METRICS
    Lead.countDocuments({ userId }),
    User.countDocuments({ _id: userId, role: "seller" }),
    Campaign.countDocuments({
      userId,
      status: "active",
      endDate: { $gte: currentDate },
    }),

    // 2. LEAD STATUS DISTRIBUTION
    Lead.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    // 3. REVENUE AND PAYMENTS
    Transaction.aggregate([
      {
        $match: {
          userId: transactionUserMatch,
          type: { $in: sellerIncomeTypes },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
        },
      },
    ]),

    // 5. CAMPAIGN PERFORMANCE
    Campaign.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          avgROI: { $avg: "$performanceMetrics.roi" },
          totalBudget: { $sum: "$budget" },
          totalSpent: { $sum: "$performanceMetrics.spent" },
        },
      },
    ]),

    // 6. LEAD BUYERS DATA
    Buyer.aggregate([
      { $match: { registeredWith: userObjId } },
      {
        $facet: {
          totalBuyers: [{ $count: "count" }],
          activeBuyers: [{ $match: { status: "active" } }, { $count: "count" }],
          topBuyers: [
            {
              $lookup: {
                from: "transactions",
                localField: "_id",
                foreignField: "userId",
                as: "leadTransactions",
              },
            },
            {
              $addFields: {
                leadTransactions: {
                  $filter: {
                    input: "$leadTransactions",
                    as: "txn",
                    cond: {
                      $and: [
                        { $eq: ["$$txn.type", "lead_purchase"] },
                        { $eq: ["$$txn.status", "completed"] },
                      ],
                    },
                  },
                },
              },
            },
            {
              $addFields: {
                totalSpent: { $sum: "$leadTransactions.amount" },
                leadsPurchased: { $size: "$leadTransactions" },
              },
            },
            {
              $project: {
                name: 1,
                company: 1,
                totalSpent: 1,
                leadsPurchased: 1,
              },
            },
            { $sort: { totalSpent: -1 } },
            { $limit: 5 },
          ],
        },
      },
    ]),

    // 6b. LEAD BUYER CREDIT SUMMARY
    Buyer.aggregate([
      { $match: { registeredWith: userObjId } },
      {
        $lookup: {
          from: "transactions",
          localField: "_id",
          foreignField: "userId",
          as: "creditTransactions",
        },
      },
      {
        $addFields: {
          creditTransactions: {
            $filter: {
              input: "$creditTransactions",
              as: "txn",
              cond: {
                $and: [
                  { $eq: ["$$txn.type", "units_purchase"] },
                  { $eq: ["$$txn.status", "completed"] },
                ],
              },
            },
          },
          walletUnitValue: { $ifNull: ["$walletUnit", 0] },
        },
      },
      {
        $addFields: {
          totalPurchasedCredits: {
            $sum: "$creditTransactions.metadata.unitsPurchased",
          },
        },
      },
      {
        $group: {
          _id: null,
          totalLeadBuyerCredits: { $sum: "$totalPurchasedCredits" },
          totalLeadBuyerUsedCredits: {
            $sum: { $subtract: ["$totalPurchasedCredits", "$walletUnitValue"] },
          },
          totalLeadBuyerRemainingCredits: { $sum: "$walletUnitValue" },
        },
      },
    ]),

    // 7. LEAD TRENDS (MONTHLY)
    Lead.aggregate([
      { $match: { userId: userId || userObjId } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          leads: { $sum: 1 },
          conversions: {
            $sum: { $cond: [{ $eq: ["$status", "sold"] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 6 },
    ]),

    // 8. REVENUE TREND (MONTHLY)
    Transaction.aggregate([
      {
        $match: {
          userId: transactionUserMatch,
          type: { $in: sellerIncomeTypes },
          status: "completed",
          createdAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),

    // 9. LEAD SOURCES
    Lead.aggregate([
      { $match: { userId: userId || userObjId } },
      {
        $group: {
          _id: "$leadSource",
          count: { $sum: 1 },
          conversions: {
            $sum: { $cond: [{ $eq: ["$status", "sold"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          source: "$_id",
          count: 1,
          conversionRate: {
            $multiply: [{ $divide: ["$conversions", "$count"] }, 100],
          },
        },
      },
    ]),

    // 10. RECENT ACTIVITIES
    Transaction.aggregate([
      {
        $match: {
          userId: transactionUserMatch,
          type: { $in: sellerIncomeTypes },
          status: "completed",
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "leads",
          localField: "metadata.leadId",
          foreignField: "_id",
          as: "lead",
        },
      },
      { $unwind: "$lead" },
      {
        $project: {
          id: "$_id",
          type: "Lead Sold",
          description: {
            $concat: [
              "Lead #",
              { $toString: "$lead._id" },
              " sold for $",
              { $toString: "$amount" },
            ],
          },
          timestamp: "$createdAt",
          amount: 1,
        },
      },
    ]),

    // 11. KPI TRENDS
    Lead.countDocuments({
      userId,
      createdAt: { $gte: oneMonthAgo, $lte: currentDate },
    }),
    Lead.countDocuments({
      userId,
      createdAt: { $gte: twoMonthsAgo, $lte: oneMonthAgo },
    }),
    Transaction.aggregate([
      {
        $match: {
          userId: transactionUserMatch,
          type: { $in: sellerIncomeTypes },
          status: "completed",
          createdAt: { $gte: oneMonthAgo, $lte: currentDate },
        },
      },
      { $group: { _id: null, revenue: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          userId: transactionUserMatch,
          type: { $in: sellerIncomeTypes },
          status: "completed",
          createdAt: { $gte: twoMonthsAgo, $lte: oneMonthAgo },
        },
      },
      { $group: { _id: null, revenue: { $sum: "$amount" } } },
    ]),

    // 12. CALL METRICS
    Call.aggregate([
      { $match: { userId: userId || userObjId } },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          avgDuration: { $avg: "$duration" },
          successfulCalls: {
            $sum: { $cond: [{ $eq: ["$status", "successful"] }, 1, 0] },
          },
        },
      },
    ]),

    // LEAD QUALITY METRICS
    Lead.aggregate([
      { $match: { userId: userId || userObjId } },
      {
        $group: {
          _id: null,
          averageLeadScore: { $avg: "$leadScore" },
          highQualityLeads: {
            $sum: { $cond: [{ $gte: ["$leadScore", 7] }, 1, 0] },
          },
          totalLeads: { $sum: 1 },
        },
      },
      {
        $project: {
          averageLeadScore: { $round: ["$averageLeadScore", 1] },
          highQualityPercentage: {
            $cond: [
              { $eq: ["$totalLeads", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$highQualityLeads", "$totalLeads"] },
                  100,
                ],
              },
            ],
          },
        },
      },
    ]),

    // TOP PERFORMING CAMPAIGNS
    Campaign.aggregate([
      {
        $match: {
          userId: userId || userObjId,
          status: { $in: ["active", "completed"] },
        },
      },
      {
        $lookup: {
          from: "leads",
          localField: "_id",
          foreignField: "campaignId",
          as: "leads",
        },
      },
      {
        $lookup: {
          from: "transactions",
          localField: "leads._id",
          foreignField: "metadata.leadId",
          as: "transactions",
          pipeline: [
            {
              $match: {
                type: { $in: sellerIncomeTypes },
                status: "completed",
              },
            },
          ],
        },
      },
      {
        $addFields: {
          totalLeads: { $size: "$leads" },
          convertedLeads: {
            $size: {
              $filter: {
                input: "$leads",
                as: "lead",
                cond: { $eq: ["$$lead.status", "sold"] },
              },
            },
          },
          totalRevenue: { $sum: "$transactions.amount" },
        },
      },
      {
        $addFields: {
          conversionRate: {
            $cond: [
              { $eq: ["$totalLeads", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$convertedLeads", "$totalLeads"] },
                  100,
                ],
              },
            ],
          },
          roi: {
            $cond: [
              { $eq: ["$budget", 0] },
              0,
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ["$totalRevenue", "$budget"] },
                      "$budget",
                    ],
                  },
                  100,
                ],
              },
            ],
          },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
      {
        $project: {
          id: "$_id",
          name: 1,
          conversionRate: { $round: ["$conversionRate", 1] },
          revenue: { $round: ["$totalRevenue", 2] },
          roi: { $round: ["$roi", 1] },
        },
      },
    ]),

    // DAILY SALES
    Transaction.aggregate([
      {
        $match: {
          userId: transactionUserMatch,
          type: { $in: sellerIncomeTypes },
          status: "completed",
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          sales: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // WEEKLY SALES
    Transaction.aggregate([
      {
        $match: {
          userId: transactionUserMatch,
          type: { $in: sellerIncomeTypes },
          status: "completed",
          createdAt: {
            $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: {
            week: { $week: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          sales: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } },
      {
        $project: {
          weekLabel: { $concat: ["Week ", { $toString: "$_id.week" }] },
          sales: 1,
          count: 1,
        },
      },
    ]),
  ]);

  // ──────────────────────────────────────────────────────
  // Process results from parallel queries
  // ──────────────────────────────────────────────────────

  const leadStatusCounts = leadStatus.reduce(
    (acc: Record<string, number>, curr: { _id: string; count: number }) => {
      acc[curr._id] = curr.count;
      return acc;
    },
    { new: 0, available: 0, sold: 0, assigned: 0 },
  );

  const { totalRevenue = 0, totalTransactions = 0 } = revenueData[0] || {};

  const conversionRate =
    totalLeads > 0
      ? ((leadStatusCounts.sold / totalLeads) * 100).toFixed(1)
      : 0;

  const {
    avgROI = 0,
    totalBudget = 0,
    totalSpent = 0,
  } = campaignPerformance[0] || {};
  const budgetUsage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const totalLeadBuyers = buyerData[0]?.totalBuyers[0]?.count || 0;
  const newLeadBuyers = buyerData[0]?.activeBuyers[0]?.count || 0;
  const topLeadBuyers = buyerData[0]?.topBuyers || [];
  const totalLeadBuyerUsedCredits =
    buyerCreditSummary[0]?.totalLeadBuyerUsedCredits || 0;
  const totalLeadBuyerRemainingCredits =
    buyerCreditSummary[0]?.totalLeadBuyerRemainingCredits || 0;
  const totalLeadBuyerCredits =
    totalLeadBuyerUsedCredits + totalLeadBuyerRemainingCredits;

  const leadVolumeTrend =
    previousPeriodLeads > 0
      ? ((currentPeriodLeads - previousPeriodLeads) / previousPeriodLeads) * 100
      : currentPeriodLeads > 0
        ? 100
        : 0;

  const revenueTrendValue =
    previousPeriodRevenue[0]?.revenue > 0
      ? ((currentPeriodRevenue[0]?.revenue -
          previousPeriodRevenue[0]?.revenue) /
          previousPeriodRevenue[0]?.revenue) *
        100
      : currentPeriodRevenue[0]?.revenue > 0
        ? 100
        : 0;

  // Construct the final response
  const responseData = {
    totalLeads,
    totalUsers,
    activeCampaigns,
    totalRevenue,
    conversionRate,
    leadStatus: leadStatusCounts,
    totalPayments: totalTransactions,
    campaignPerformance: {
      roi: avgROI,
      budgetUsage,
    },
    totalLeadBuyers,
    newLeadBuyers,
    totalLeadBuyerCredits,
    totalLeadBuyerUsedCredits,
    totalLeadBuyerRemainingCredits,
    newLeads: leadStatusCounts.new,
    purchasedLeads: leadStatusCounts.sold,
    leadTrends: {
      monthlyLeads: leadTrends.map((t) => t.leads),
      monthlyConversions: leadTrends.map((t) => t.conversions),
    },
    leadStatusDistribution: Object.entries(leadStatusCounts).map(
      ([status, count]) => ({
        status,
        count,
      }),
    ),
    topPerformingCampaigns,
    leadQualityMetrics: {
      averageLeadScore: leadQualityMetrics[0]?.averageLeadScore || 0,
      highQualityPercentage: leadQualityMetrics[0]?.highQualityPercentage || 0,
      // contactRate: followUpMetrics[0]?.contactRate || 0,
      // followUpRate: followUpMetrics[0]?.followUpRate || 0,
    },
    revenueTrend: revenueTrend.map(
      (rt: { _id: { year: number; month: number }; revenue: number }) => ({
        month: new Date(rt._id.year, rt._id.month - 1, 1).toLocaleString(
          "default",
          {
            month: "short",
          },
        ),
        revenue: rt.revenue,
      }),
    ),
    leadSources: leadSources.map((ls) => ({
      source: ls.source,
      count: ls.count,
      conversionRate: ls.conversionRate,
    })),
    recentActivities,
    kpiTrends: {
      conversionRateTrend: 0, // Implement similar to leadVolumeTrend
      revenueTrend: revenueTrendValue,
      leadVolumeTrend,
    },
    topLeadBuyers: topLeadBuyers.map(
      (buyer: {
        _id: string;
        name: string;
        leadsPurchased: number;
        totalSpent: number;
      }) => ({
        id: buyer._id,
        name: buyer.name,
        leadsPurchased: buyer.leadsPurchased,
        totalSpend: buyer.totalSpent,
      }),
    ),
    salesPerformance: {
      daily: dailySales.map((ds: { _id: string; sales: number }) => ({
        day: ds._id,
        sales: ds.sales,
      })),
      weekly: weeklySales.map((ws: { weekLabel: string; sales: number }) => ({
        week: ws.weekLabel,
        sales: ws.sales,
      })),
      monthly: revenueTrend.map(
        (rt: { _id: { year: number; month: number }; revenue: number }) => ({
          month: new Date(rt._id.year, rt._id.month - 1, 1).toLocaleString(
            "default",
            {
              month: "short",
            },
          ),
          sales: rt.revenue,
        }),
      ),
    },
    callMetrics: {
      totalCalls: callMetrics[0]?.totalCalls || 0,
      avgDuration: callMetrics[0]?.avgDuration || 0,
      callSuccessRate:
        callMetrics[0]?.totalCalls > 0
          ? (callMetrics[0].successfulCalls / callMetrics[0].totalCalls) * 100
          : 0,
    },
  };

  return successResponse(responseData);
});
