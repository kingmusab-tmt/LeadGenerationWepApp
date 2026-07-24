// GET /api/marketing/email/campaigns/[id]/recipients - Paginated per-recipient delivery status
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { EmailCampaign, EmailQueue } from "@/models/emailCampaign";
import {
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Authentication required");
    }

    await dbConnect();

    const campaign = await EmailCampaign.findById(id).select("userId").lean();
    if (!campaign) {
      return notFound("Campaign");
    }
    if (campaign.userId.toString() !== session.user.id) {
      return forbidden("Forbidden");
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "25", 10) || 25),
    );
    const statusFilter = searchParams.get("status");

    const query: Record<string, unknown> = { campaignId: id };
    if (
      statusFilter &&
      ["pending", "sending", "sent", "failed", "bounced", "unsubscribed"].includes(
        statusFilter,
      )
    ) {
      query.status = statusFilter;
    }

    const [total, recipients] = await Promise.all([
      EmailQueue.countDocuments(query),
      EmailQueue.find(query)
        .select(
          "recipientEmail status variant openedAt clickedAt error attemptCount lastAttempt createdAt",
        )
        .sort({ createdAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json(
      {
        recipients,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching campaign recipients:", error);
    return internalError("Failed to fetch campaign recipients");
  }
}
