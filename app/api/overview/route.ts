import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { User } from "../../../models/user";
import { Campaign } from "../../../models/campaign";
import { Lead } from "@/models/leads";
import { Buyer } from "@/models/leadbuyers";
import { Transaction } from "@/models/transactions";
import dbConnect from "@/lib/connectdb";
import Call from "@/models/call";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    // Connect to MongoDB
    await dbConnect();

    // Get the session
    const session = await getServerSession(authOptions);

    // Validate session
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized: No valid session found" },
        { status: 401 }
      );
    }

    // Extract user ID from the session
    const userId = session.user.id;
    //("User ID:", userId);

    // Get current date and previous periods for trend calculations
    const currentDate = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(currentDate.getMonth() - 1);
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(currentDate.getMonth() - 2);

    // 1. BASIC METRICS
    const totalLeads = await Lead.countDocuments({ userId });
    const totalUsers = await User.countDocuments({
      _id: userId,
      role: "seller",
    });
    const activeCampaigns = await Campaign.countDocuments({
      userId,
      status: "active",
      endDate: { $gte: currentDate },
    });

    // 2. LEAD STATUS DISTRIBUTION
    const leadStatus = await Lead.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    //(leadStatus);

    const leadStatusCounts = leadStatus.reduce(
      (acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      },
      { new: 0, available: 0, sold: 0, assigned: 0 }
    );
    //(`new: ${leadStatusCounts.new}`);
    //(`Avaiable Leads: ${leadStatusCounts.available}`);
    //(`sold Leads: ${leadStatusCounts.sold}`);

    // 3. REVENUE AND PAYMENTS (using Transaction schema)
    const revenueData = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: "seller_income",
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
    ]);

    const { totalRevenue = 0, totalTransactions = 0 } = revenueData[0] || {};

    // 4. CONVERSION RATE (using sold leads vs total leads)
    const conversionRate =
      totalLeads > 0
        ? ((leadStatusCounts.sold / totalLeads) * 100).toFixed(1)
        : 0;

    // 5. CAMPAIGN PERFORMANCE
    const campaignPerformance = await Campaign.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          avgROI: { $avg: "$performanceMetrics.roi" },
          totalBudget: { $sum: "$budget" },
          totalSpent: { $sum: "$performanceMetrics.spent" },
        },
      },
    ]);

    const {
      avgROI = 0,
      totalBudget = 0,
      totalSpent = 0,
    } = campaignPerformance[0] || {};
    const budgetUsage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    // 6. LEAD BUYERS DATA
    // const buyerData = await Buyer.aggregate([
    //   { $match: { registeredWith: new mongoose.Types.ObjectId(userId) } },
    //   {
    //     $facet: {
    //       totalBuyers: [{ $count: "count" }],
    //       activeBuyers: [{ $match: { status: "active" } }, { $count: "count" }],
    //       topBuyers: [
    //         {
    //           $lookup: {
    //             from: "transactions",
    //             localField: "userId",
    //             foreignField: "buyer._id",
    //             as: "transactions",
    //           },
    //         },
    //         {
    //           $project: {
    //             name: 1,
    //             company: 1,
    //             totalSpent: {
    //               $sum: {
    //                 $map: {
    //                   input: "$transactions",
    //                   as: "txn",
    //                   in: {
    //                     $cond: [
    //                       { $eq: ["$$txn.type", "lead_purchase"] },
    //                       "$$txn.amount",
    //                       0,
    //                     ],
    //                   },
    //                 },
    //               },
    //             },
    //             leadsPurchased: {
    //               $sum: {
    //                 $map: {
    //                   input: "$transactions",
    //                   as: "txn",
    //                   in: {
    //                     $cond: [{ $eq: ["$$txn.type", "lead_purchase"] }, 1, 0],
    //                   },
    //                 },
    //               },
    //             },
    //           },
    //         },
    //         { $sort: { totalSpent: -1 } },
    //         { $limit: 5 },
    //       ],
    //     },
    //   },
    // ]);
    // const buyerData = await Buyer.aggregate([
    //   { $match: { registeredWith: new mongoose.Types.ObjectId(userId) } },
    //   {
    //     $facet: {
    //       totalBuyers: [{ $count: "count" }],
    //       activeBuyers: [{ $match: { status: "active" } }, { $count: "count" }],
    //       topBuyers: [
    //         {
    //           $lookup: {
    //             from: "transactions",
    //             let: { buyerIdStr: { $toString: "$_id" } },
    //             pipeline: [
    //               {
    //                 $match: {
    //                   $expr: {
    //                     $and: [
    //                       { $eq: ["$type", "lead_purchase"] },
    //                       { $eq: ["$metadata.buyerId", "$$buyerIdStr"] },
    //                       { $eq: ["$status", "completed"] },
    //                     ],
    //                   },
    //                 },
    //               },
    //             ],
    //             as: "leadTransactions",
    //           },
    //         },
    //         {
    //           $addFields: {
    //             totalSpent: {
    //               $sum: "$leadTransactions.amount",
    //             },
    //             leadsPurchased: {
    //               $size: "$leadTransactions",
    //             },
    //           },
    //         },
    //         {
    //           $project: {
    //             name: 1,
    //             company: 1,
    //             totalSpent: 1,
    //             leadsPurchased: 1,
    //           },
    //         },
    //         { $sort: { totalSpent: -1 } },
    //         { $limit: 5 },
    //       ],
    //     },
    //   },
    // ]);
    const buyerData = await Buyer.aggregate([
      { $match: { registeredWith: new mongoose.Types.ObjectId(userId) } },
      {
        $facet: {
          totalBuyers: [{ $count: "count" }],
          activeBuyers: [{ $match: { status: "active" } }, { $count: "count" }],
          topBuyers: [
            {
              $lookup: {
                from: "transactions",
                localField: "_id", // Buyer's _id
                foreignField: "userId", // Transaction userId field
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
    ]);

    const totalLeadBuyers = buyerData[0]?.totalBuyers[0]?.count || 0;
    const newLeadBuyers = buyerData[0]?.activeBuyers[0]?.count || 0;
    const topLeadBuyers = buyerData[0]?.topBuyers || [];
    //(topLeadBuyers);
    // 7. LEAD TRENDS (MONTHLY)
    const leadTrends = await Lead.aggregate([
      { $match: { userId: userId || new mongoose.Types.ObjectId(userId) } },
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
    ]);

    // 8. REVENUE TREND (MONTHLY) - Using Transaction schema
    const revenueTrend = await Transaction.aggregate([
      {
        $match: {
          userId: userId || new mongoose.Types.ObjectId(userId),
          type: "seller_income",
          status: "completed",
          createdAt: { $gte: twoMonthsAgo },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 9. LEAD SOURCES
    const leadSources = await Lead.aggregate([
      { $match: { userId: userId || new mongoose.Types.ObjectId(userId) } },
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
    ]);

    // 10. RECENT ACTIVITIES - Using Transaction schema
    const recentActivities = await Transaction.aggregate([
      {
        $match: {
          userId: userId || new mongoose.Types.ObjectId(userId),
          type: "seller_income",
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
    ]);

    // 11. KPI TRENDS (compared to previous period)
    const currentPeriodLeads = await Lead.countDocuments({
      userId,
      createdAt: { $gte: oneMonthAgo, $lte: currentDate },
    });

    const previousPeriodLeads = await Lead.countDocuments({
      userId,
      createdAt: { $gte: twoMonthsAgo, $lte: oneMonthAgo },
    });

    const leadVolumeTrend =
      previousPeriodLeads > 0
        ? ((currentPeriodLeads - previousPeriodLeads) / previousPeriodLeads) *
          100
        : currentPeriodLeads > 0
        ? 100
        : 0;

    // Calculate revenue trend
    const currentPeriodRevenue = await Transaction.aggregate([
      {
        $match: {
          userId: userId || new mongoose.Types.ObjectId(userId),
          type: "seller_income",
          status: "completed",
          createdAt: { $gte: oneMonthAgo, $lte: currentDate },
        },
      },
      { $group: { _id: null, revenue: { $sum: "$amount" } } },
    ]);

    const previousPeriodRevenue = await Transaction.aggregate([
      {
        $match: {
          userId: userId || new mongoose.Types.ObjectId(userId),
          type: "seller_income",
          status: "completed",
          createdAt: { $gte: twoMonthsAgo, $lte: oneMonthAgo },
        },
      },
      { $group: { _id: null, revenue: { $sum: "$amount" } } },
    ]);

    const revenueTrendValue =
      previousPeriodRevenue[0]?.revenue > 0
        ? ((currentPeriodRevenue[0]?.revenue -
            previousPeriodRevenue[0]?.revenue) /
            previousPeriodRevenue[0]?.revenue) *
          100
        : currentPeriodRevenue[0]?.revenue > 0
        ? 100
        : 0;

    // 12. CALL METRICS
    const callMetrics = await Call.aggregate([
      { $match: { userId: userId || new mongoose.Types.ObjectId(userId) } },
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
    ]);

    // LEAD QUALITY METRICS
    const leadQualityMetrics = await Lead.aggregate([
      { $match: { userId: userId || new mongoose.Types.ObjectId(userId) } },
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
    ]);

    // TOP PERFORMING CAMPAIGNS
    const topPerformingCampaigns = await Campaign.aggregate([
      {
        $match: {
          userId: userId || new mongoose.Types.ObjectId(userId),
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
            { $match: { type: "seller_income", status: "completed" } },
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
    ]);

    const dailySales = await Transaction.aggregate([
      {
        $match: {
          userId: userId || new mongoose.Types.ObjectId(userId),
          type: "seller_income",
          status: "completed",
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
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
    ]);

    // WEEKLY SALES - Using Transaction schema
    const weeklySales = await Transaction.aggregate([
      {
        $match: {
          userId: userId || new mongoose.Types.ObjectId(userId),
          type: "seller_income",
          status: "completed",
          createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
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
    ]);

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
        })
      ),
      topPerformingCampaigns,
      leadQualityMetrics: {
        averageLeadScore: leadQualityMetrics[0]?.averageLeadScore || 0,
        highQualityPercentage:
          leadQualityMetrics[0]?.highQualityPercentage || 0,
        // contactRate: followUpMetrics[0]?.contactRate || 0,
        // followUpRate: followUpMetrics[0]?.followUpRate || 0,
      },
      revenueTrend: revenueTrend.map((rt: { _id: number; revenue: any }) => ({
        month: new Date(0, rt._id - 1).toLocaleString("default", {
          month: "short",
        }),
        revenue: rt.revenue,
      })),
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
          _id: any;
          name: any;
          leadsPurchased: any;
          totalSpent: any;
        }) => ({
          id: buyer._id,
          name: buyer.name,
          leadsPurchased: buyer.leadsPurchased,
          totalSpend: buyer.totalSpent,
        })
      ),
      salesPerformance: {
        daily: dailySales.map((ds: { _id: any; sales: any }) => ({
          day: ds._id,
          sales: ds.sales,
        })),
        weekly: weeklySales.map((ws: { weekLabel: any; sales: any }) => ({
          week: ws.weekLabel,
          sales: ws.sales,
        })),
        monthly: revenueTrend.map((rt: { _id: number; revenue: any }) => ({
          month: new Date(0, rt._id - 1).toLocaleString("default", {
            month: "short",
          }),
          sales: rt.revenue,
        })),
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

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching overview data:", error);
    return NextResponse.json(
      { error: "Failed to fetch overview data" },
      { status: 500 }
    );
  }
}
