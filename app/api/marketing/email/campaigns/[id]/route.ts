// GET /api/email-campaigns/[id] - Get campaign details
// PUT /api/email-campaigns/[id] - Update campaign
// DELETE /api/email-campaigns/[id] - Delete campaign
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import {
  EmailCampaign,
  EmailQueue,
  EmailTrackingEvent,
} from "@/models/emailCampaign";
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  unauthorized,
  handleValidationError,
} from "@/lib/api/error-handler";
import { updateEmailCampaignSchema } from "@/lib/validation/schemas";
import { sanitizeEmailHtml } from "@/lib/sanitizeEmailHtml";
import { requireCsrf } from "@/lib/security/requireCsrf";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";
import { ZodError } from "zod";

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

    const csrfError = requireCsrf(req, session.user.email);
    if (csrfError) return csrfError;

    const rateLimited = await checkSimpleRateLimit(req, {
      scope: "email-campaigns-update",
      limit: 60,
      windowMs: 10 * 60 * 1000,
      actorId: session.user.id,
    });
    if (rateLimited) return rateLimited;

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

    let validatedData;
    try {
      const body = await req.json();
      validatedData = await updateEmailCampaignSchema.parseAsync(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid request body");
    }

    const {
      name,
      subject,
      htmlContent,
      body: legacyBody,
      textContent,
      fromEmail,
      fromName,
      replyTo,
      recipientList,
      tags,
      goals,
      abTesting,
    } = validatedData;

    // Update fields
    if (name) campaign.name = name;
    if (subject) campaign.subject = subject;
    if (htmlContent !== undefined || legacyBody !== undefined) {
      campaign.htmlContent = sanitizeEmailHtml(htmlContent || legacyBody || "");
    }
    if (textContent !== undefined) campaign.textContent = textContent;
    if (fromEmail !== undefined) campaign.fromEmail = fromEmail;
    if (fromName !== undefined) campaign.fromName = fromName;
    if (replyTo !== undefined) campaign.replyTo = replyTo;
    if (recipientList) {
      campaign.recipientEmails = recipientList;
      campaign.totalRecipients = recipientList.length;
    }
    if (tags) campaign.tags = tags;
    if (goals) campaign.goals = goals;
    if (abTesting) {
      campaign.abTesting = {
        ...abTesting,
        variantContent: abTesting.variantContent
          ? sanitizeEmailHtml(abTesting.variantContent)
          : abTesting.variantContent,
      };
    }

    const updatedCampaign = await campaign.save();

    return NextResponse.json(
      {
        message: "Campaign updated successfully",
        campaign: updatedCampaign,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Error updating campaign:", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return badRequest("You already have a campaign with this name");
    }
    return internalError("Failed to update campaign");
  }
}

/**
 * DELETE /api/email-campaigns/[id]
 * Delete campaign
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Authentication required");
    }

    const csrfError = requireCsrf(req, session.user.email);
    if (csrfError) return csrfError;

    const rateLimited = await checkSimpleRateLimit(req, {
      scope: "email-campaigns-delete",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      actorId: session.user.id,
    });
    if (rateLimited) return rateLimited;

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

    // Delete campaign and all associated per-recipient records — queue
    // items and tracking events both reference this campaignId, so leaving
    // either behind orphans them permanently.
    await EmailCampaign.findByIdAndDelete(id);
    await EmailQueue.deleteMany({ campaignId: id });
    await EmailTrackingEvent.deleteMany({ campaignId: id });

    return NextResponse.json(
      { message: "Campaign deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return internalError("Failed to delete campaign");
  }
}
