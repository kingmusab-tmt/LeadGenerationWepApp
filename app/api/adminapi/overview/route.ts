// app/api/admin/overview/route.ts
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { User } from "@/models/user";
import { Transaction } from "@/models/transactions";
import { Lead } from "@/models/leads";
import Call from "@/models/call";
import { Verifications } from "@/models/vertification";
import { Buyer } from "@/models/leadbuyers";

// Connect to MongoDB if not already connected
const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!);
  }
};

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Get date ranges for analytics
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(now.getMonth() - 12);

    // Fetch all counts in parallel for better performance
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalSellers,
      verifiedSellers,
      totalBuyers,
      activeBuyers,
      totalTransactions,
      totalRevenue,
      monthlyRevenue,
      pendingVerifications,
      totalLeads,
      soldLeads,
      totalCalls,
      callMinutes,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: "active" }),
      User.countDocuments({ status: "suspended" }),
      User.countDocuments({ role: "seller" }),
      User.countDocuments({
        role: "seller",
        "subscription.isSubscriptionActive": true,
      }),
      Buyer.countDocuments(),
      Buyer.countDocuments({ status: "active" }),
      Transaction.countDocuments(),
      Transaction.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        {
          $match: {
            status: "completed",
            createdAt: { $gte: oneMonthAgo },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Verifications.countDocuments({ verificationStatus: "pending" }),
      Lead.countDocuments(),
      Lead.countDocuments({ status: "sold" }),
      Call.countDocuments(),
      Call.aggregate([
        { $group: { _id: null, total: { $sum: "$callDuration" } } },
      ]),
    ]);

    // Get user growth data (last 12 months)
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
      {
        $project: {
          month: {
            $dateToString: {
              format: "%b",
              date: {
                $dateFromParts: {
                  year: "$_id.year",
                  month: "$_id.month",
                  day: 1,
                },
              },
            },
          },
          users: "$count",
        },
      },
    ]);

    // Get revenue trend data (last 12 months)
    const revenueTrend = await Transaction.aggregate([
      {
        $match: {
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
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
      {
        $project: {
          month: {
            $dateToString: {
              format: "%b",
              date: {
                $dateFromParts: {
                  year: "$_id.year",
                  month: "$_id.month",
                  day: 1,
                },
              },
            },
          },
          revenue: "$revenue",
        },
      },
    ]);

    // Get user distribution by role
    const userDistribution = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          role: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id", "seller"] }, then: "Sellers" },
                { case: { $eq: ["$_id", "buyer"] }, then: "Buyers" },
                { case: { $eq: ["$_id", "admin"] }, then: "Admins" },
                { case: { $eq: ["$_id", "staff"] }, then: "Staff" },
              ],
              default: "Other",
            },
          },
          count: 1,
        },
      },
      {
        $match: { role: { $ne: "Other" } },
      },
    ]);

    // Get recent transactions
    const recentTransactions = await Transaction.find({})
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();

    // Get recent verifications
    const recentVerifications = await Verifications.find({})
      .sort({ timestamp: -1 })
      .limit(3)
      .lean();

    // Calculate call minutes
    const totalCallMinutes = callMinutes[0]?.total
      ? Math.round(callMinutes[0].total / 60)
      : 0;

    // Prepare response data
    const responseData = {
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalSellers,
      verifiedSellers,
      totalBuyers,
      activeBuyers,
      totalRevenue: totalRevenue[0]?.total || 0,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
      totalTransactions,
      pendingVerifications,
      totalLeads,
      soldLeads,
      totalCalls,
      callMinutes: totalCallMinutes,
      userGrowth,
      revenueTrend,
      userDistribution,
      recentTransactions: recentTransactions.map((txn) => ({
        id: txn._id.toString(),
        type: txn.type,
        amount: txn.amount,
        userId: txn.userId.toString(),
        status: txn.status,
        createdAt: txn.createdAt.toISOString(),
      })),
      recentVerifications: recentVerifications.map((ver) => ({
        id: ver._id.toString(),
        sellerId: ver.sellerId,
        status: ver.verificationStatus,
        method: ver.verificationMethod,
        timestamp: ver.timestamp.toISOString(),
      })),
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Failed to fetch admin overview data:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin overview data" },
      { status: 500 }
    );
  }
}
