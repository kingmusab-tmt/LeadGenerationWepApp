// POST /api/email-campaigns/[id]/send - Send campaign
// POST /api/email-campaigns/[id]/test - Send test email
// POST /api/email-campaigns/[id]/pause - Pause campaign
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { EmailCampaign } from "@/models/emailCampaign";
import { emailMarketingEngine } from "@/lib/emailMarketingEngine";
import { getSubscriptionLimits } from "@/lib/subscriptionLimitsService";
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Authentication required");
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    await dbConnect();

    const campaign = await EmailCampaign.findById(id);

    if (!campaign) {
      return notFound("Campaign");
    }

    // Check ownership
    if (campaign.userId.toString() !== session.user.id) {
      return forbidden("Forbidden");
    }

    // ==================== SEND ====================
    if (action === "send") {
      // Check if email campaigns feature is enabled
      const limits = await getSubscriptionLimits(session.user.id);
      if (!limits?.emailCampaignsEnabled) {
        return forbidden(
          "Email campaigns feature is not included in your subscription plan. Please upgrade to access this feature.",
        );
      }

      const result = await emailMarketingEngine.sendCampaignImmediate(id);

      if (!result.success) {
        return badRequest(result.message || "Failed to send campaign");
      }

      return NextResponse.json(
        {
          message: result.message,
          sent: result.sent,
          failed: result.failed,
        },
        { status: 200 },
      );
    }

    // ==================== SEND TEST ====================
    if (action === "test") {
      const body = await req.json();
      const { testEmail } = body;

      if (!testEmail) {
        return badRequest("Test email address required");
      }

      const result = await emailMarketingEngine.sendTestEmail(id, testEmail);

      if (!result.success) {
        return badRequest(result.message || "Failed to send test email");
      }

      return NextResponse.json({ message: result.message }, { status: 200 });
    }

    // ==================== PAUSE ====================
    if (action === "pause") {
      if (campaign.status !== "sending") {
        return badRequest("Campaign is not currently sending");
      }

      await EmailCampaign.findByIdAndUpdate(id, {
        status: "paused",
      });

      return NextResponse.json(
        { message: "Campaign paused successfully" },
        { status: 200 },
      );
    }

    // ==================== RESUME ====================
    if (action === "resume") {
      if (campaign.status !== "paused") {
        return badRequest("Campaign is not paused");
      }

      await EmailCampaign.findByIdAndUpdate(id, {
        status: "sending",
      });

      // Continue processing remaining queue items
      const result = await emailMarketingEngine.queueManager.processQueue(id);

      // Update analytics.sent
      if (result.sent > 0) {
        await EmailCampaign.findByIdAndUpdate(id, {
          $inc: { "analytics.sent": result.sent },
        });
      }

      return NextResponse.json(
        {
          message: `Campaign resumed. Sent ${result.sent} remaining emails.`,
          sent: result.sent,
          failed: result.failed,
        },
        { status: 200 },
      );
    }

    return badRequest("Invalid action");
  } catch (error) {
    console.error("Error processing campaign action:", error);
    return internalError("Failed to process action");
  }
}
