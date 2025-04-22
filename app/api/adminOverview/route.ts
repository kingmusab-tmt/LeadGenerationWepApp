import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next"; // Import session helper
import { authOptions } from "@/auth"; // Import your NextAuth configuration
import { User, Payment } from "@/models/user";
import { Campaign } from "@/models/campaign";
import { Lead } from "@/models/leads";
import { Buyer } from "@/models/leadbuyers";
import dbConnect from "@/lib/connectdb";

export async function GET(req: NextRequest) {
  try {
    // Connect to MongoDB
    await dbConnect();

    // Get the session
    const session = await getServerSession(authOptions);

    // Validate session
    if (!session || !session.user?.id || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized: No valid session found" },
        { status: 401 }
      );
    }

    // Extract user ID from the session
    const userId = session.user.id;

    // Aggregate data for Overview
    const totalLeads = await Lead.countDocuments();
    const totalUsers = await User.countDocuments({ role: "seller" });
    const activeCampaigns = await Campaign.countDocuments({ status: "active" });

    // Calculate total revenue from completed payments
    const totalRevenue = await Payment.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalPayments = totalRevenue[0]?.total || 0;

    // Lead Status (new, verified, closed)
    const leadStatus = await Lead.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const leadStatusCounts = leadStatus.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    // Calculate Conversion Rate
    const totalVerifiedLeads = leadStatusCounts["verified"] || 0;
    const conversionRate =
      totalLeads > 0 ? ((totalVerifiedLeads / totalLeads) * 100).toFixed(1) : 0;

    // Campaign performance example: Budget usage (dummy data for now)
    const campaignPerformance = {
      budgetUsage: 75, // Dummy percentage, you can implement real calculations
    };

    // Fetch lead buyers registered under the current user
    const totalLeadBuyers = await Buyer.countDocuments({
      registeredWith: userId,
    });

    // Fetch lead buyers whose status is "active" (treated as new)
    const newLeadBuyers = await Buyer.countDocuments({
      registeredWith: userId,
      status: "active",
    });

    // Fetch leads whose status is "new"
    const newLeads = await Lead.countDocuments({ status: "new" });

    // Fetch leads available for purchase (sold is false)
    const purchaseLeads = await Lead.countDocuments({ sold: false });

    // Respond with the aggregated data
    return NextResponse.json({
      totalLeads,
      totalUsers,
      activeCampaigns,
      totalRevenue: totalPayments,
      conversionRate,
      leadStatus: leadStatusCounts,
      totalPayments,
      campaignPerformance,
      totalLeadBuyers,
      newLeadBuyers,
      newLeads,
      purchaseLeads,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch overview data" },
      { status: 500 }
    );
  }
}
