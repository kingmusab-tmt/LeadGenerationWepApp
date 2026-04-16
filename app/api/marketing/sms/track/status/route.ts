import { NextRequest, NextResponse } from "next/server";
import { smsMarketingEngine } from "@/lib/smsMarketingEngine";
import dbConnect from "@/lib/connectdb";
import { SmsQueue } from "@/models/smsCampaign";
import { callSecurityMiddleware } from "@/lib/security/callSecurity";
import { internalError } from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const securityResponse = await callSecurityMiddleware(req, {
      rateLimit: true,
      validateWebhook: true,
    });
    if (securityResponse) return securityResponse;

    await dbConnect();
    const formData = await req.formData();
    const messageSid = (formData.get("MessageSid") as string) || "";
    const messageStatus = (formData.get("MessageStatus") as string) || "";
    const to = (formData.get("To") as string) || "";

    const queueItem = await SmsQueue.findOne({ messageSid });
    const userId = queueItem?.userId || "";
    const campaignId = queueItem?.campaignId?.toString();

    await smsMarketingEngine.recordDeliveryStatus(
      messageSid,
      messageStatus,
      to,
      userId,
      campaignId,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[SmsTrackStatus] POST error:", error);
    return internalError("Failed to process delivery status callback");
  }
}
