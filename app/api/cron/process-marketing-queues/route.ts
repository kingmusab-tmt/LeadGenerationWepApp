import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { EmailCampaign } from "@/models/emailCampaign";
import { SmsCampaign } from "@/models/smsCampaign";
import { emailMarketingEngine } from "@/lib/emailMarketingEngine";
import { smsMarketingEngine } from "@/lib/smsMarketingEngine";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/process-marketing-queues
 *
 * Bulk email/SMS sends process a fixed batch (100 recipients) per request
 * and previously had no automatic way to pick up where a batch left off —
 * a campaign larger than that stalled in "sending" status until a human
 * repeatedly clicked resume. This drains one more batch for every
 * currently-sending campaign; wire it to a real scheduler to run
 * automatically (e.g. Vercel Cron — see vercel.json — or any external cron
 * service hitting this URL every few minutes with the right header).
 *
 * Protected by CRON_SECRET so it isn't publicly triggerable — set that env
 * var and call with `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const emailResults: Array<{
    campaignId: string;
    sent: number;
    failed: number;
    bounced: number;
  }> = [];
  const smsResults: Array<{ campaignId: string; error?: string }> = [];

  const sendingEmailCampaigns = await EmailCampaign.find({
    status: "sending",
  }).select("_id");

  for (const campaign of sendingEmailCampaigns) {
    const campaignId = String(campaign._id);
    try {
      const result =
        await emailMarketingEngine.queueManager.processQueue(campaignId);
      if (result.sent > 0 || result.bounced > 0) {
        await EmailCampaign.findByIdAndUpdate(campaignId, {
          $inc: {
            "analytics.sent": result.sent,
            "analytics.bounced": result.bounced,
          },
        });
      }
      emailResults.push({ campaignId, ...result });
    } catch (error) {
      console.error(
        `[Cron] Failed to process email campaign ${campaignId}:`,
        error,
      );
      emailResults.push({
        campaignId,
        sent: 0,
        failed: 0,
        bounced: 0,
      });
    }
  }

  const sendingSmsCampaigns = await SmsCampaign.find({
    status: "sending",
  }).select("_id");

  for (const campaign of sendingSmsCampaigns) {
    const campaignId = String(campaign._id);
    try {
      // Safe to call repeatedly — sendCampaignImmediate only enqueues once
      // (checked via SmsQueue.exists) and otherwise just processes the next
      // pending batch, same as the "resume" action does.
      await smsMarketingEngine.sendCampaignImmediate(campaignId);
      smsResults.push({ campaignId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[Cron] Failed to process SMS campaign ${campaignId}:`,
        error,
      );
      smsResults.push({ campaignId, error: message });
    }
  }

  return NextResponse.json({
    success: true,
    processed: {
      emailCampaigns: emailResults.length,
      smsCampaigns: smsResults.length,
    },
    emailResults,
    smsResults,
  });
}
