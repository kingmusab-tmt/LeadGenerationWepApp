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

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    await dbConnect();

    const campaign = await EmailCampaign.findById(id);

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    // Check ownership
    if (campaign.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ==================== SEND ====================
    if (action === "send") {
      // Check if email campaigns feature is enabled
      const limits = await getSubscriptionLimits(session.user.id);
      if (!limits?.emailCampaignsEnabled) {
        return NextResponse.json(
          {
            error:
              "Email campaigns feature is not included in your subscription plan. Please upgrade to access this feature.",
          },
          { status: 403 },
        );
      }

      const result = await emailMarketingEngine.sendCampaignImmediate(id);

      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 });
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
        return NextResponse.json(
          { error: "Test email address required" },
          { status: 400 },
        );
      }

      const result = await emailMarketingEngine.sendTestEmail(id, testEmail);

      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }

      return NextResponse.json({ message: result.message }, { status: 200 });
    }

    // ==================== PAUSE ====================
    if (action === "pause") {
      if (campaign.status !== "sending") {
        return NextResponse.json(
          { error: "Campaign is not currently sending" },
          { status: 400 },
        );
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
        return NextResponse.json(
          { error: "Campaign is not paused" },
          { status: 400 },
        );
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

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing campaign action:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 },
    );
  }
}
