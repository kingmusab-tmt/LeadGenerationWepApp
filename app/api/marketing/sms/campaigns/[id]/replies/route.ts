import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { SmsCampaign, SmsEvent } from "@/models/smsCampaign";
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
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Authentication required");
    }

    await dbConnect();

    const campaign = await SmsCampaign.findById(id);
    if (!campaign) {
      return notFound("Campaign");
    }

    if (campaign.userId !== session.user.id) {
      return forbidden("Forbidden");
    }

    const replies = await SmsEvent.find({
      campaignId: campaign._id,
      userId: session.user.id,
      type: "replied",
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const items = replies.map((reply) => ({
      _id: reply._id,
      phone: reply.phone,
      body: typeof reply.meta?.body === "string" ? reply.meta.body : "",
      createdAt: reply.createdAt,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[GET /api/marketing/sms/campaigns/[id]/replies]", error);
    return internalError("Failed to fetch campaign replies");
  }
}
