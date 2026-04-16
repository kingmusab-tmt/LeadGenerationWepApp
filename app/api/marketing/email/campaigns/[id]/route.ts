// GET /api/email-campaigns/[id] - Get campaign details
// PUT /api/email-campaigns/[id] - Update campaign
// DELETE /api/email-campaigns/[id] - Delete campaign
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { EmailCampaign, EmailQueue } from "@/models/emailCampaign";
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

/**
 * GET /api/email-campaigns/[id]
 * Get campaign details
 */
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

    return NextResponse.json(campaign, { status: 200 });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return internalError("Failed to fetch campaign");
  }
}

/**
 * PUT /api/email-campaigns/[id]
 * Update campaign
 */
export async function PUT(
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

    const campaign = await EmailCampaign.findById(id);

    if (!campaign) {
      return notFound("Campaign");
    }

    // Check ownership
    if (campaign.userId.toString() !== session.user.id) {
      return forbidden("Forbidden");
    }

    // Cannot update if campaign is sending or completed
    if (["sending", "completed"].includes(campaign.status)) {
      return badRequest(
        `Cannot update campaign with status: ${campaign.status}`,
      );
    }

    const body = await req.json();
    const {
      name,
      subject,
      htmlContent,
      textContent,
      fromEmail,
      fromName,
      replyTo,
      recipientList,
      schedule,
      abTesting,
      trackingPixel,
      trackLinks,
      unsubscribeLink,
      tags,
    } = body;

    // Update fields
    if (name) campaign.name = name;
    if (subject) campaign.subject = subject;
    if (htmlContent !== undefined) campaign.htmlContent = htmlContent;
    if (textContent !== undefined) campaign.textContent = textContent;
    if (fromEmail !== undefined) campaign.fromEmail = fromEmail;
    if (fromName !== undefined) campaign.fromName = fromName;
    if (replyTo !== undefined) campaign.replyTo = replyTo;
    if (recipientList && Array.isArray(recipientList)) {
      campaign.recipientEmails = recipientList;
      campaign.totalRecipients = recipientList.length;
    }
    if (schedule) campaign.schedule = schedule;
    if (abTesting) campaign.abTesting = abTesting;
    if (trackingPixel !== undefined) campaign.trackingPixel = trackingPixel;
    if (trackLinks !== undefined) campaign.trackLinks = trackLinks;
    if (unsubscribeLink !== undefined)
      campaign.unsubscribeLink = unsubscribeLink;
    if (tags && Array.isArray(tags)) campaign.tags = tags;

    const updatedCampaign = await campaign.save();

    return NextResponse.json(
      {
        message: "Campaign updated successfully",
        campaign: updatedCampaign,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating campaign:", error);
    return internalError("Failed to update campaign");
  }
}

/**
 * DELETE /api/email-campaigns/[id]
 * Delete campaign
 */
export async function DELETE(
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

    // Cannot delete if campaign is sending
    if (campaign.status === "sending") {
      return badRequest("Cannot delete campaign while sending");
    }

    // Delete campaign and associated queue items
    await EmailCampaign.findByIdAndDelete(id);
    await EmailQueue.deleteMany({ campaignId: id });

    return NextResponse.json(
      { message: "Campaign deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return internalError("Failed to delete campaign");
  }
}
