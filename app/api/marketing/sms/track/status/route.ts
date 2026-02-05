import { NextRequest, NextResponse } from "next/server";
import { smsMarketingEngine } from "@/lib/smsMarketingEngine";
import dbConnect from "@/lib/connectdb";
import { SmsQueue } from "@/models/smsCampaign";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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
    campaignId
  );
  return NextResponse.json({ ok: true });
}
