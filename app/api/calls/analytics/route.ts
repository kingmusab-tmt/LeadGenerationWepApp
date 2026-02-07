import { NextRequest } from "next/server";
import dbConnect from "@/lib/connectdb";
import Call from "@/models/call";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  successResponse,
  unauthorized,
  internalError,
} from "@/lib/api/error-handler";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return unauthorized("Please log in.");
    }
    const sellerId = session.user.id;

    const calls = await Call.find({ userId: sellerId }).sort({ createdAt: -1 });

    const totalCalls = calls.length;
    const completedCalls = calls.filter((c) => c.status === "completed").length;
    const noAnswerCalls = calls.filter((c) => c.status === "no-answer").length;
    const failedCalls = calls.filter(
      (c) => c.status === "failed" || c.status === "insufficient_balance",
    ).length;
    const forwardedCalls = calls.filter((c) => c.status === "forwarded").length;

    // Answer rate
    const answerRate =
      totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;

    // Average duration (only completed calls with duration)
    const callsWithDuration = calls.filter(
      (c) => c.status === "completed" && c.callDuration && c.callDuration > 0,
    );
    const avgDuration =
      callsWithDuration.length > 0
        ? Math.round(
            callsWithDuration.reduce(
              (sum, c) => sum + (c.callDuration || 0),
              0,
            ) / callsWithDuration.length,
          )
        : 0;

    // Total units charged
    const totalUnitsCharged = calls.reduce(
      (sum, c) => sum + (c.unitsCharged || 0),
      0,
    );

    // Total revenue from calls (units)
    const totalRevenue = totalUnitsCharged;

    // Refund stats
    const refundedCalls = calls.filter(
      (c) => c.paymentStatus === "refunded",
    ).length;
    const pendingRefundCalls = calls.filter(
      (c) => c.paymentStatus === "pending_refund",
    ).length;

    // Calls per day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCalls = calls.filter(
      (c) => new Date(c.createdAt) >= thirtyDaysAgo,
    );

    const callsByDay: Record<string, number> = {};
    recentCalls.forEach((c) => {
      const day = new Date(c.createdAt).toISOString().split("T")[0];
      callsByDay[day] = (callsByDay[day] || 0) + 1;
    });

    // Fill in missing days
    const dailyData: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dailyData.push({ date: key, count: callsByDay[key] || 0 });
    }

    // Calls by status
    const callsByStatus: Record<string, number> = {};
    calls.forEach((c) => {
      callsByStatus[c.status] = (callsByStatus[c.status] || 0) + 1;
    });

    // Calls by industry
    const callsByIndustry: Record<string, number> = {};
    calls.forEach((c) => {
      const industry = c.industry || "Unknown";
      callsByIndustry[industry] = (callsByIndustry[industry] || 0) + 1;
    });

    // Recent activity (last 10 calls)
    const recentActivity = calls.slice(0, 10).map((c) => ({
      _id: c._id,
      from: c.from,
      to: c.to,
      status: c.status,
      callDuration: c.callDuration,
      industry: c.industry,
      createdAt: c.createdAt,
      unitsCharged: c.unitsCharged,
      paymentStatus: c.paymentStatus,
    }));

    // Peak hours
    const callsByHour: Record<number, number> = {};
    calls.forEach((c) => {
      const hour = new Date(c.createdAt).getHours();
      callsByHour[hour] = (callsByHour[hour] || 0) + 1;
    });
    const peakHour = Object.entries(callsByHour).sort(
      ([, a], [, b]) => b - a,
    )[0];

    return successResponse({
      summary: {
        totalCalls,
        completedCalls,
        noAnswerCalls,
        failedCalls,
        forwardedCalls,
        answerRate,
        avgDuration,
        totalUnitsCharged,
        totalRevenue,
        refundedCalls,
        pendingRefundCalls,
        peakHour: peakHour
          ? { hour: parseInt(peakHour[0]), count: peakHour[1] }
          : null,
      },
      dailyData,
      callsByStatus,
      callsByIndustry,
      recentActivity,
    });
  } catch (error) {
    console.error("Error fetching call analytics:", error);
    return internalError("Failed to fetch call analytics");
  }
}
