// GET /api/email-campaigns/[id]/analytics - Get campaign analytics
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { EmailCampaign } from "@/models/emailCampaign";
import { EmailAnalyticsEngine } from "@/lib/emailMarketingEngine";
import {
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Authentication required");
    }

    await dbConnect();

    const campaign = await EmailCampaign.findById(id);

    if (!campaign) {
      return notFound("Campaign");
    }

    // Check ownership
    if (campaign.userId.toString() !== session.user.id) {
      return forbidden("Forbidden");
    }

    const analyticsEngine = new EmailAnalyticsEngine();
    const stats = await analyticsEngine.getCampaignStats(id);
    const detailedAnalytics = await analyticsEngine.getDetailedAnalytics(id);

    return NextResponse.json(
      {
        stats,
        detailedAnalytics,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return internalError("Failed to fetch analytics");
  }
}
