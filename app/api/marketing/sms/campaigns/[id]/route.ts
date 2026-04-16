import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { SmsCampaign } from "@/models/smsCampaign";
import { internalError, notFound, unauthorized } from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized("Authentication required");

    await dbConnect();
    const campaign = await SmsCampaign.findById(id);
    if (!campaign || campaign.userId !== session.user.id) {
      return notFound("Campaign");
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("[GET /api/marketing/sms/campaigns/[id]]", error);
    return internalError("Failed to fetch campaign");
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized("Authentication required");

    await dbConnect();
    const body = await req.json();
    const campaign = await SmsCampaign.findById(id);
    if (!campaign || campaign.userId !== session.user.id) {
      return notFound("Campaign");
    }

    const updated = await SmsCampaign.findByIdAndUpdate(id, body, {
      new: true,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/marketing/sms/campaigns/[id]]", error);
    return internalError("Failed to update campaign");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized("Authentication required");

    await dbConnect();
    const campaign = await SmsCampaign.findById(id);
    if (!campaign || campaign.userId !== session.user.id) {
      return notFound("Campaign");
    }

    await SmsCampaign.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/marketing/sms/campaigns/[id]]", error);
    return internalError("Failed to delete campaign");
  }
}
