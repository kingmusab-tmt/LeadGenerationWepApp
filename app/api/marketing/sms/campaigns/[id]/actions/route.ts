import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { SmsCampaign } from "@/models/smsCampaign";
import { smsMarketingEngine } from "@/lib/smsMarketingEngine";
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
    if (!session?.user) return unauthorized("Authentication required");

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    await dbConnect();
    const campaign = await SmsCampaign.findById(id);
    if (!campaign) return notFound("Campaign");
    if (campaign.userId !== session.user.id) return forbidden("Forbidden");

    if (action === "send") {
      // Check recipient limit
      const recipientCount = campaign.recipients?.length || 0;
      const limits = await getSubscriptionLimits(session.user.id);
      const maxRecipients = limits?.smsRecipientsPerCampaign || 0;

      if (maxRecipients > 0 && recipientCount > maxRecipients) {
        return forbidden(
          `Recipient limit exceeded. Your plan allows ${maxRecipients} recipients per SMS campaign, but this campaign has ${recipientCount}.`,
        );
      }

      // Ensure campaign has a Twilio phone number assigned
      if (!campaign.fromPhoneNumber) {
        return badRequest(
          "No phone number assigned to this campaign. Please generate or assign a Twilio phone number before sending.",
        );
      }

      const result = await smsMarketingEngine.sendCampaignImmediate(id);
      if (!result.success)
        return badRequest(result.message || "Failed to send campaign");
      return NextResponse.json(
        { message: result.message, sent: result.sent, failed: result.failed },
        { status: 200 },
      );
    }

    if (action === "test") {
      const body = await req.json();
      const { testPhone } = body;
      if (!testPhone) return badRequest("Test phone required");
      const result = await smsMarketingEngine.sendTestSms(id, testPhone);
      if (!result.success)
        return badRequest(result.message || "Failed to send test SMS");
      return NextResponse.json({ message: result.message }, { status: 200 });
    }

    if (action === "pause") {
      if (campaign.status !== "sending")
        return badRequest("Campaign is not currently sending");
      await SmsCampaign.findByIdAndUpdate(id, { status: "paused" });
      return NextResponse.json(
        { message: "Campaign paused successfully" },
        { status: 200 },
      );
    }

    if (action === "resume") {
      if (campaign.status !== "paused")
        return badRequest("Campaign is not paused");
      await SmsCampaign.findByIdAndUpdate(id, { status: "sending" });
      // Resume sending remaining queue items
      const result = await smsMarketingEngine.sendCampaignImmediate(id);
      return NextResponse.json(
        {
          message: "Campaign resumed",
          sent: result.sent || 0,
          failed: result.failed || 0,
        },
        { status: 200 },
      );
    }

    return badRequest("Invalid action");
  } catch (error) {
    console.error("Error processing SMS campaign action:", error);
    return internalError("Failed to process action");
  }
}
