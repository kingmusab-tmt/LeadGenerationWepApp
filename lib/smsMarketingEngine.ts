import twilio from "twilio";
import mongoose from "mongoose";
import {
  SmsCampaign,
  SmsSegment,
  SmsQueue,
  SmsEvent,
  ISmsRecipient,
} from "@/models/smsCampaign";
import { User } from "@/models";
import dbConnect from "@/lib/connectdb";

class SmsTemplateEngine {
  static render(
    text: string,
    variables: Record<string, string | number> = {},
  ): string {
    return text.replace(/{{\s*(\w+)\s*}}/g, (_, key) =>
      String(variables[key] ?? ""),
    );
  }
}

class TwilioManager {
  static async getClient(userId: string) {
    await dbConnect();
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const accountSid =
      user.apiSettings?.twilioSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken =
      user.apiSettings?.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken)
      throw new Error("Twilio credentials missing");

    return twilio(accountSid, authToken);
  }

  static async getFromNumber(userId: string): Promise<string> {
    const user = await User.findById(userId);
    const fromNumber =
      user?.apiSettings?.twilioPhoneNumber || process.env.TWILIO_FROM_NUMBER;
    if (!fromNumber) throw new Error("Twilio from number missing");
    return fromNumber;
  }
}

class SmsQueueManager {
  static BATCH_SIZE = 100;
  static MAX_ATTEMPTS = 3;

  static async enqueueCampaign(campaignId: string) {
    const campaign = await SmsCampaign.findById(campaignId);
    if (!campaign) throw new Error("Campaign not found");

    const recipients = campaign.segmentId
      ? (await SmsSegment.findById(campaign.segmentId))?.recipients || []
      : campaign.recipients;

    const queueDocs = recipients.map((r) => ({
      campaignId: campaign._id,
      userId: campaign.userId,
      recipient: r,
      status: "pending",
      attempts: 0,
    }));

    await SmsQueue.insertMany(queueDocs);
    await SmsEvent.create({
      campaignId: campaign._id,
      userId: campaign.userId,
      type: "queued",
      phone: "*",
      meta: { count: recipients.length },
    });

    await SmsCampaign.findByIdAndUpdate(campaign._id, {
      $set: { "stats.queued": recipients.length, status: "sending" },
    });
  }

  static async processBatch(userId: string, campaignId: string) {
    const client = await TwilioManager.getClient(userId);
    const fromNumber = await TwilioManager.getFromNumber(userId);

    const batchItems = await SmsQueue.find({
      campaignId,
      status: "pending",
    })
      .sort({ createdAt: 1 })
      .limit(SmsQueueManager.BATCH_SIZE);

    for (const item of batchItems) {
      try {
        const text = SmsTemplateEngine.render(
          (await SmsCampaign.findById(campaignId))!.textContent,
          item.recipient.variables || {},
        );
        const message = await client.messages.create({
          body: text,
          from: fromNumber,
          to: item.recipient.phone,
          statusCallback: `https://${process.env.NEXT_PUBLIC_DOMAIN}/api/marketing/sms/track/status`,
        });
        await SmsQueue.findByIdAndUpdate(item._id, {
          status: "sent",
          attempts: item.attempts + 1,
          messageSid: message.sid,
        });
        await SmsEvent.create({
          campaignId: item.campaignId,
          userId,
          type: "sent",
          phone: item.recipient.phone,
        });
        await SmsCampaign.findByIdAndUpdate(campaignId, {
          $inc: { "stats.sent": 1 },
        });
      } catch (error) {
        await SmsQueue.findByIdAndUpdate(item._id, {
          status:
            item.attempts + 1 >= SmsQueueManager.MAX_ATTEMPTS
              ? "failed"
              : "pending",
          attempts: item.attempts + 1,
          error: error instanceof Error ? error.message : String(error),
        });
        await SmsEvent.create({
          campaignId: item.campaignId,
          userId,
          type: "failed",
          phone: item.recipient.phone,
          meta: {
            error: error instanceof Error ? error.message : String(error),
          },
        });
        if (item.attempts + 1 >= SmsQueueManager.MAX_ATTEMPTS) {
          await SmsCampaign.findByIdAndUpdate(campaignId, {
            $inc: { "stats.failed": 1 },
          });
        }
      }
    }
  }
}

// SmsAnalyticsEngine - Reserved for future analytics dashboard implementation
// SmsScheduler - Reserved for future scheduled campaign feature
// These classes are kept for extensibility and will be utilized in upcoming versions

class SmsMarketingEngine {
  async createCampaign(
    userId: string,
    payload: Partial<ISmsRecipient> & {
      name: string;
      textContent: string;
      recipients?: ISmsRecipient[];
      segmentId?: string;
      templateId?: string;
      scheduleAt?: Date;
    },
  ) {
    await dbConnect();
    const campaign = await SmsCampaign.create({
      userId,
      name: payload.name,
      templateId: payload.templateId,
      segmentId: payload.segmentId,
      recipients: payload.recipients || [],
      textContent: payload.textContent,
      scheduleAt: payload.scheduleAt,
      status: "draft",
      stats: {
        queued: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        clicks: 0,
        replies: 0,
        optOuts: 0,
      },
    });
    return campaign;
  }

  async sendCampaignImmediate(campaignId: string) {
    await dbConnect();
    await SmsQueueManager.enqueueCampaign(campaignId);
    await SmsQueueManager.processBatch(
      (await SmsCampaign.findById(campaignId))!.userId,
      campaignId,
    );
    return {
      success: true,
      message: "SMS campaign started",
      sent: (await SmsCampaign.findById(campaignId))!.stats.sent,
      failed: (await SmsCampaign.findById(campaignId))!.stats.failed,
    };
  }

  async sendTestSms(campaignId: string, testPhone: string) {
    await dbConnect();
    const campaign = await SmsCampaign.findById(campaignId);
    if (!campaign) return { success: false, message: "Campaign not found" };

    const client = await TwilioManager.getClient(campaign.userId);
    const fromNumber = await TwilioManager.getFromNumber(campaign.userId);
    const text = SmsTemplateEngine.render(campaign.textContent, {});

    await client.messages.create({
      body: text,
      from: fromNumber,
      to: testPhone,
    });

    return { success: true, message: "Test SMS sent" };
  }

  async handleInboundMessage(userId: string, from: string, body: string) {
    await dbConnect();
    const normalized = body.trim().toUpperCase();

    if (["STOP", "UNSUBSCRIBE", "CANCEL"].includes(normalized)) {
      await SmsEvent.create({
        userId,
        campaignId: new mongoose.Types.ObjectId(),
        type: "optout",
        phone: from,
      });
      return { reply: "You have been unsubscribed. Reply START to opt-in." };
    }
    if (["START", "UNSTOP", "SUBSCRIBE"].includes(normalized)) {
      await SmsEvent.create({
        userId,
        campaignId: new mongoose.Types.ObjectId(),
        type: "optin",
        phone: from,
      });
      return { reply: "You have opted in. Thank you!" };
    }
    if (["HELP", "INFO"].includes(normalized)) {
      return { reply: "Reply STOP to unsubscribe. Msg&data rates may apply." };
    }

    await SmsEvent.create({
      userId,
      campaignId: new mongoose.Types.ObjectId(),
      type: "replied",
      phone: from,
      meta: { body },
    });
    return { reply: "Thanks for your message." };
  }

  async recordDeliveryStatus(
    messageSid: string,
    status: string,
    to: string,
    userId: string,
    campaignId?: string,
  ) {
    await dbConnect();
    const resolvedCampaignId = campaignId
      ? new mongoose.Types.ObjectId(campaignId)
      : new mongoose.Types.ObjectId();

    if (status === "delivered") {
      await SmsEvent.create({
        userId,
        campaignId: resolvedCampaignId,
        type: "delivered",
        phone: to,
        meta: { messageSid },
      });
      await SmsCampaign.findByIdAndUpdate(campaignId, {
        $inc: { "stats.delivered": 1 },
      });
      // Update queue item status
      await SmsQueue.findOneAndUpdate({ messageSid }, { status: "delivered" });
    } else if (status === "undelivered" || status === "failed") {
      await SmsEvent.create({
        userId,
        campaignId: resolvedCampaignId,
        type: "failed",
        phone: to,
        meta: { messageSid, twilioStatus: status },
      });
      await SmsCampaign.findByIdAndUpdate(campaignId, {
        $inc: { "stats.failed": 1 },
      });
      await SmsQueue.findOneAndUpdate(
        { messageSid },
        { status: "failed", error: `Twilio status: ${status}` },
      );
    }
  }
}

export const smsMarketingEngine = new SmsMarketingEngine();
