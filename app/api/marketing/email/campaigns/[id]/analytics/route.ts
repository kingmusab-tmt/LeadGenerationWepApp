// GET /api/email-campaigns/[id]/analytics - Get campaign analytics
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { EmailCampaign } from "@/models/emailCampaign";
import { EmailAnalyticsEngine } from "@/lib/emailMarketingEngine";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const campaign = await EmailCampaign.findById(id);

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (campaign.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const analyticsEngine = new EmailAnalyticsEngine();
    const stats = await analyticsEngine.getCampaignStats(id);
    const detailedAnalytics = await analyticsEngine.getDetailedAnalytics(id);

    return NextResponse.json(
      {
        stats,
        detailedAnalytics,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
