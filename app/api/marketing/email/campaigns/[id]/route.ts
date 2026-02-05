// GET /api/email-campaigns/[id] - Get campaign details
// PUT /api/email-campaigns/[id] - Update campaign
// DELETE /api/email-campaigns/[id] - Delete campaign
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { EmailCampaign, EmailQueue } from "@/models/emailCampaign";

export const dynamic = "force-dynamic";

/**
 * GET /api/email-campaigns/[id]
 * Get campaign details
 */
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

    return NextResponse.json(campaign, { status: 200 });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/email-campaigns/[id]
 * Update campaign
 */
export async function PUT(
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

    // Cannot update if campaign is sending or completed
    if (["sending", "completed"].includes(campaign.status)) {
      return NextResponse.json(
        { error: `Cannot update campaign with status: ${campaign.status}` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      name,
      subject,
      htmlContent,
      textContent,
      schedule,
      abTesting,
      trackingPixel,
      trackLinks,
      unsubscribeLink,
    } = body;

    // Update fields
    if (name) campaign.name = name;
    if (subject) campaign.subject = subject;
    if (htmlContent) campaign.htmlContent = htmlContent;
    if (textContent) campaign.textContent = textContent;
    if (schedule) campaign.schedule = schedule;
    if (abTesting) campaign.abTesting = abTesting;
    if (trackingPixel !== undefined) campaign.trackingPixel = trackingPixel;
    if (trackLinks !== undefined) campaign.trackLinks = trackLinks;
    if (unsubscribeLink !== undefined)
      campaign.unsubscribeLink = unsubscribeLink;

    const updatedCampaign = await campaign.save();

    return NextResponse.json(
      {
        message: "Campaign updated successfully",
        campaign: updatedCampaign,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating campaign:", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/email-campaigns/[id]
 * Delete campaign
 */
export async function DELETE(
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

    // Cannot delete if campaign is sending
    if (campaign.status === "sending") {
      return NextResponse.json(
        { error: "Cannot delete campaign while sending" },
        { status: 400 }
      );
    }

    // Delete campaign and associated queue items
    await EmailCampaign.findByIdAndDelete(id);
    await EmailQueue.deleteMany({ campaignId: id });

    return NextResponse.json(
      { message: "Campaign deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
