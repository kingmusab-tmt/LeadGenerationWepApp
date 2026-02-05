import { NextRequest, NextResponse } from "next/server";
import { Campaign } from "@/models/campaign";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

// GET /api/campaigns/[campaignId] - Fetch a specific campaign
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { campaignId } = await params;
    await dbConnect();

    const campaign = await Campaign.findOne({
      _id: campaignId,
      userId: session.user.id,
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        campaignId: (campaign._id as Types.ObjectId).toString(),
        name: campaign.name,
        description: campaign.description,
        startDate: campaign.startDate?.toISOString().split("T")[0],
        endDate: campaign.endDate?.toISOString().split("T")[0],
        budget: campaign.budget,
        status: campaign.status === "draft" ? "new" : campaign.status,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign." },
      { status: 500 },
    );
  }
}

// PUT /api/campaigns/[campaignId] - Update a campaign
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { campaignId } = await params;
    await dbConnect();
    const body = await req.json();

    const campaign = await Campaign.findOneAndUpdate(
      { _id: campaignId, userId: session.user.id },
      {
        name: body.name,
        description: body.description,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        budget: body.budget,
        status: body.status === "new" ? "draft" : body.status,
        updatedAt: new Date(),
      },
      { new: true },
    );

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        campaignId: (campaign._id as Types.ObjectId).toString(),
        name: campaign.name,
        description: campaign.description,
        startDate: campaign.startDate?.toISOString().split("T")[0],
        endDate: campaign.endDate?.toISOString().split("T")[0],
        budget: campaign.budget,
        status: campaign.status === "draft" ? "new" : campaign.status,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating campaign:", error);
    return NextResponse.json(
      { error: "Failed to update campaign." },
      { status: 500 },
    );
  }
}

// DELETE /api/campaigns/[campaignId] - Delete a campaign
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { campaignId } = await params;
    await dbConnect();

    const campaign = await Campaign.findOneAndDelete({
      _id: campaignId,
      userId: session.user.id,
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Campaign deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json(
      { error: "Failed to delete campaign." },
      { status: 500 },
    );
  }
}
