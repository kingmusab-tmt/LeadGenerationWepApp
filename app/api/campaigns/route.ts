import { NextRequest, NextResponse } from "next/server";
import { Campaign } from "@/models/campaign";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

// GET /api/campaigns - Fetch all campaigns for the authenticated user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const campaigns = await Campaign.find({ userId: session.user.id }).sort({
      createdAt: -1,
    });

    // Transform MongoDB documents to match frontend interface
    const formattedCampaigns = campaigns.map((campaign) => ({
      campaignId: (campaign._id as { toString: () => string }).toString(),
      name: campaign.name,
      description: campaign.description,
      startDate: campaign.startDate?.toISOString().split("T")[0],
      endDate: campaign.endDate?.toISOString().split("T")[0],
      budget: campaign.budget,
      status: campaign.status === "draft" ? "new" : campaign.status,
    }));

    return NextResponse.json(formattedCampaigns, { status: 200 });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns." },
      { status: 500 },
    );
  }
}

// POST /api/campaigns - Create a new campaign
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();

    const campaign = await Campaign.create({
      userId: session.user.id,
      name: body.name,
      description: body.description,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      budget: body.budget,
      status: body.status === "new" ? "draft" : body.status || "draft",
    });

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
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign." },
      { status: 500 },
    );
  }
}
