// Description: Email Marketing Engine - Handles email sending, templating, scheduling, and tracking
import nodemailer from "nodemailer";
import { User } from "@/models";
import {
  EmailCampaign,
  EmailQueue,
  EmailTrackingEvent,
} from "@/models/emailCampaign";
import dbConnect from "@/lib/connectdb";
import crypto from "crypto";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// ==================== TEMPLATE ENGINE ====================

export class EmailTemplateEngine {
  /**
   * Render template with variables
   * @param template HTML template with {{variable}} syntax
   * @param variables Object with variable values
   * @returns Rendered HTML
   */
  static renderTemplate(
    template: string,
    variables: Record<string, string | number> = {},
  ): string {
    let rendered = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      rendered = rendered.replace(regex, String(value || ""));
    });
    return rendered;
  }

  /**
   * Add tracking pixel to email
   * @param html Email HTML content
   * @param trackingToken Unique tracking token
   * @returns HTML with tracking pixel
   */
  static addTrackingPixel(html: string, trackingToken: string): string {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      "https://localhost:3000";
    const pixel = `<img src="${baseUrl}/api/marketing/email/track/open/${trackingToken}" width="1" height="1" alt="" />`;
    return html + pixel;
  }

  /**
   * Add click tracking to links
   * @param html Email HTML content
   * @param trackingToken Unique tracking token
   * @returns HTML with tracked links
   */
  static addLinkTracking(html: string, trackingToken: string): string {
    const linkRegex = /href="([^"]*)"/g;
    return html.replace(linkRegex, (match, url) => {
      if (url.startsWith("http")) {
        const encodedUrl = Buffer.from(url).toString("base64");
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          process.env.NEXTAUTH_URL ||
          "https://localhost:3000";
        return `href="${baseUrl}/api/marketing/email/track/click/${trackingToken}?url=${encodedUrl}"`;
      }
      return match;
    });
  }

  /**
   * Add unsubscribe link to email
   * @param html Email HTML content
   * @param unsubscribeToken Token for unsubscribe link
   * @param campaignId Campaign ID
   * @returns HTML with unsubscribe link
   */
  static addUnsubscribeLink(
    html: string,
    unsubscribeToken: string,
    campaignId: string,
  ): string {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      "https://localhost:3000";
    const unsubscribeLink = `<a href="${baseUrl}/api/marketing/email/unsubscribe/${unsubscribeToken}?campaign=${campaignId}">Unsubscribe</a>`;
    const footer = `<footer style="margin-top: 40px; text-align: center; font-size: 12px; color: #999;">${unsubscribeLink}</footer>`;
    return html.replace("</body>", `${footer}</body>`);
  }
}

// ==================== TRANSPORTER MANAGER ====================

export class TransporterManager {
  private transporters: Map<string, nodemailer.Transporter> = new Map();

  /**
   * Get or create transporter for a user (seller)
   */
  async getTransporter(userId: string): Promise<nodemailer.Transporter> {
    if (this.transporters.has(userId)) {
      return this.transporters.get(userId)!;
    }

    await dbConnect();
    const user = await User.findById(userId);

    if (!user?.emailSettings?.smtpServer) {
      throw new Error(`Email settings not configured for user ${userId}`);
    }

    const config: EmailConfig = {
      host: user.emailSettings.smtpServer,
      port: user.emailSettings.port || 587,
      secure: user.emailSettings.port === 465,
      auth: {
        user: user.emailSettings.smtpUser || process.env.EMAIL_FROM!,
        pass: user.emailSettings.smtpPassword || process.env.EMAIL_PASSWORD!,
      },
    };

    const transporter = nodemailer.createTransport(config);

    // Verify connection
    try {
      await transporter.verify();
    } catch (error) {
      console.error("SMTP connection failed:", error);
      throw new Error("SMTP connection failed. Check email settings.");
    }

    this.transporters.set(userId, transporter);
    return transporter;
  }

  /**
   * Clear cached transporter
   */
  clearTransporter(userId: string): void {
    this.transporters.delete(userId);
  }
}

// ==================== EMAIL QUEUE MANAGER ====================

export class EmailQueueManager {
  private transporterManager: TransporterManager;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds

  constructor() {
    this.transporterManager = new TransporterManager();
  }

  /**
   * Add emails to queue for a campaign
   */
  async addToQueue(campaignId: string, recipients: string[]): Promise<number> {
    await dbConnect();

    const campaign = await EmailCampaign.findById(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    // Exclude previously unsubscribed recipients (those with "unsubscribed" status in any queue item for this user's campaigns)
    const userCampaignIds = await EmailCampaign.find({
      userId: campaign.userId,
    }).distinct("_id");
    const unsubscribedEmails = await EmailQueue.find({
      campaignId: { $in: userCampaignIds },
      status: "unsubscribed",
    }).distinct("recipientEmail");

    const unsubscribedSet = new Set(
      unsubscribedEmails.map((e: string) => e.toLowerCase()),
    );
    const filteredRecipients = recipients.filter(
      (email) => !unsubscribedSet.has(email.toLowerCase()),
    );

    if (filteredRecipients.length === 0) {
      return 0;
    }

    const queueItems = filteredRecipients.map((email) => ({
      campaignId,
      recipientEmail: email,
      status: "pending",
      attemptCount: 0,
      trackingToken: crypto.randomBytes(16).toString("hex"),
    }));

    const result = await EmailQueue.insertMany(queueItems);
    return result.length;
  }

  /**
   * Process email queue
   */
  async processQueue(
    campaignId: string,
    batchSize: number = 100,
  ): Promise<{ sent: number; failed: number }> {
    await dbConnect();

    const campaign = await EmailCampaign.findById(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    const transporter = await this.transporterManager.getTransporter(
      campaign.userId.toString(),
    );

    // Get pending emails
    const pendingEmails = await EmailQueue.find({
      campaignId,
      status: "pending",
      attemptCount: { $lt: this.MAX_RETRIES },
    }).limit(batchSize);

    let sent = 0;
    let failed = 0;

    for (const queueItem of pendingEmails) {
      try {
        // Render email content
        let htmlContent = EmailTemplateEngine.renderTemplate(
          campaign.htmlContent,
          {
            recipientEmail: queueItem.recipientEmail,
            ...queueItem.personalizationData,
          },
        );

        // Add tracking
        if (campaign.trackingPixel) {
          htmlContent = EmailTemplateEngine.addTrackingPixel(
            htmlContent,
            queueItem.trackingToken!,
          );
        }

        if (campaign.trackLinks) {
          htmlContent = EmailTemplateEngine.addLinkTracking(
            htmlContent,
            queueItem.trackingToken!,
          );
        }

        if (campaign.unsubscribeLink) {
          htmlContent = EmailTemplateEngine.addUnsubscribeLink(
            htmlContent,
            queueItem.trackingToken!,
            campaignId,
          );
        }

        // Send email
        const mailOptions = {
          from: `${campaign.fromName} <${campaign.fromEmail}>`,
          to: queueItem.recipientEmail,
          subject: campaign.subject,
          html: htmlContent,
          text: campaign.textContent || "",
          replyTo: campaign.replyTo || campaign.fromEmail,
          headers: {
            "X-Campaign-ID": campaignId,
            "X-Tracking-Token": queueItem.trackingToken || "",
          },
        };

        const info = (await transporter.sendMail(mailOptions)) as {
          messageId?: string;
        };

        // Update queue item
        await EmailQueue.findByIdAndUpdate(queueItem._id, {
          status: "sent",
          messageId: info.messageId,
          lastAttempt: new Date(),
        });

        // Record event
        await EmailTrackingEvent.create({
          queueId: queueItem._id,
          campaignId,
          eventType: "sent",
          timestamp: new Date(),
        });

        sent++;
      } catch (error) {
        failed++;

        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";

        await EmailQueue.findByIdAndUpdate(queueItem._id, {
          attemptCount: queueItem.attemptCount + 1,
          error: errorMsg,
          lastAttempt: new Date(),
          status:
            queueItem.attemptCount + 1 >= this.MAX_RETRIES
              ? "failed"
              : "pending",
        });

        console.error(
          `Failed to send email to ${queueItem.recipientEmail}:`,
          error,
        );
      }

      // Avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Update campaign statistics
    const completedCount = await EmailQueue.countDocuments({
      campaignId,
      status: { $in: ["sent", "failed"] },
    });

    if (completedCount >= campaign.totalRecipients) {
      await EmailCampaign.findByIdAndUpdate(campaignId, {
        status: "completed",
        completedAt: new Date(),
      });
    }

    return { sent, failed };
  }

  /**
   * Retry failed emails
   */
  async retryFailed(campaignId: string): Promise<number> {
    await dbConnect();

    const result = await EmailQueue.updateMany(
      {
        campaignId,
        status: "failed",
        attemptCount: { $lt: this.MAX_RETRIES },
      },
      {
        status: "pending",
        error: null,
      },
    );

    return result.modifiedCount;
  }
}

// ==================== ANALYTICS ENGINE ====================

export class EmailAnalyticsEngine {
  /**
   * Record email open
   */
  async recordOpen(trackingToken: string): Promise<void> {
    await dbConnect();

    const queueItem = await EmailQueue.findOne({
      trackingToken,
    });

    if (!queueItem) return;

    // Update queue item
    await EmailQueue.findByIdAndUpdate(queueItem._id, {
      openedAt: new Date(),
    });

    // Record event
    await EmailTrackingEvent.create({
      queueId: queueItem._id,
      campaignId: queueItem.campaignId,
      eventType: "opened",
      timestamp: new Date(),
    });

    // Update campaign analytics
    await EmailCampaign.findByIdAndUpdate(queueItem.campaignId, {
      $inc: { "analytics.opened": 1 },
      "analytics.updatedAt": new Date(),
    });
  }

  /**
   * Record link click
   */
  async recordClick(trackingToken: string, linkUrl: string): Promise<void> {
    await dbConnect();

    const queueItem = await EmailQueue.findOne({
      trackingToken,
    });

    if (!queueItem) return;

    // Update queue item
    await EmailQueue.findByIdAndUpdate(queueItem._id, {
      clickedAt: new Date(),
    });

    // Record event
    await EmailTrackingEvent.create({
      queueId: queueItem._id,
      campaignId: queueItem.campaignId,
      eventType: "clicked",
      timestamp: new Date(),
      metadata: {
        linkUrl,
      },
    });

    // Update campaign analytics
    await EmailCampaign.findByIdAndUpdate(queueItem.campaignId, {
      $inc: { "analytics.clicked": 1 },
      "analytics.updatedAt": new Date(),
    });
  }

  /**
   * Record unsubscribe
   */
  async recordUnsubscribe(trackingToken: string): Promise<void> {
    await dbConnect();

    const queueItem = await EmailQueue.findOne({
      trackingToken,
    });

    if (!queueItem) return;

    // Mark this queue item as unsubscribed
    await EmailQueue.findByIdAndUpdate(queueItem._id, {
      status: "unsubscribed",
    });

    // Record event
    await EmailTrackingEvent.create({
      queueId: queueItem._id,
      campaignId: queueItem.campaignId,
      eventType: "unsubscribed",
      timestamp: new Date(),
    });

    // Update campaign analytics
    await EmailCampaign.findByIdAndUpdate(queueItem.campaignId, {
      $inc: { "analytics.unsubscribed": 1 },
      "analytics.updatedAt": new Date(),
    });

    // Add this email to a global unsubscribe list by marking all pending queue items for this email
    // across all campaigns from the same user as unsubscribed
    const campaign = await EmailCampaign.findById(queueItem.campaignId);
    if (campaign) {
      await EmailQueue.updateMany(
        {
          recipientEmail: queueItem.recipientEmail,
          status: "pending",
          campaignId: {
            $in: await EmailCampaign.find({ userId: campaign.userId }).distinct(
              "_id",
            ),
          },
        },
        { status: "unsubscribed" },
      );
    }
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: string) {
    await dbConnect();

    const campaign = await EmailCampaign.findById(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    const total = campaign.totalRecipients;
    const analytics = campaign.analytics;

    return {
      total,
      sent: analytics.sent,
      delivered: analytics.delivered,
      opened: analytics.opened,
      openRate:
        total > 0 ? ((analytics.opened / total) * 100).toFixed(2) + "%" : "0%",
      clicked: analytics.clicked,
      clickRate:
        total > 0 ? ((analytics.clicked / total) * 100).toFixed(2) + "%" : "0%",
      unsubscribed: analytics.unsubscribed,
      bounced: analytics.bounced,
      complained: analytics.complained,
      conversions: analytics.conversions,
      revenue: analytics.revenue || 0,
    };
  }

  /**
   * Get detailed campaign analytics with timeline
   */
  async getDetailedAnalytics(campaignId: string) {
    await dbConnect();

    const { Types } = await import("mongoose");
    const events = await EmailTrackingEvent.aggregate([
      {
        $match: {
          campaignId: new Types.ObjectId(campaignId),
        },
      },
      {
        $group: {
          _id: {
            eventType: "$eventType",
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    return events;
  }
}

// ==================== SCHEDULER ====================

export class EmailScheduler {
  private jobs: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Schedule campaign for sending
   */
  scheduleOnce(campaignId: string, scheduledTime: Date): void {
    const now = new Date();
    const delay = scheduledTime.getTime() - now.getTime();

    if (delay <= 0) {
      console.warn(`Scheduled time is in the past for campaign ${campaignId}`);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        await dbConnect();
        await EmailCampaign.findByIdAndUpdate(campaignId, {
          status: "sending",
        });

        const queueManager = new EmailQueueManager();
        await queueManager.processQueue(campaignId);

        this.jobs.delete(campaignId);
      } catch (error) {
        console.error(`Failed to send campaign ${campaignId}:`, error);
      }
    }, delay);

    this.jobs.set(campaignId, timeout);
  }

  /**
   * Schedule recurring campaign
   */
  scheduleRecurring(campaignId: string, cronExpression: string): void {
    // Using a simple implementation, in production use node-cron
    console.log(
      `Recurring campaign ${campaignId} scheduled with cron: ${cronExpression}`,
    );
    // TODO: Implement using node-cron or similar
  }

  /**
   * Cancel scheduled campaign
   */
  cancelSchedule(campaignId: string): boolean {
    const timeout = this.jobs.get(campaignId);
    if (timeout) {
      clearTimeout(timeout);
      this.jobs.delete(campaignId);
      return true;
    }
    return false;
  }

  /**
   * Get all scheduled jobs
   */
  getScheduledJobs(): string[] {
    return Array.from(this.jobs.keys());
  }
}

// ==================== MAIN EMAIL MARKETING ENGINE ====================

export class EmailMarketingEngine {
  templateEngine = EmailTemplateEngine;
  queueManager: EmailQueueManager;
  analyticsEngine: EmailAnalyticsEngine;
  scheduler: EmailScheduler;

  constructor() {
    this.queueManager = new EmailQueueManager();
    this.analyticsEngine = new EmailAnalyticsEngine();
    this.scheduler = new EmailScheduler();
  }

  /**
   * Send campaign immediately
   */
  async sendCampaignImmediate(campaignId: string): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    message: string;
  }> {
    try {
      await dbConnect();

      const campaign = await EmailCampaign.findById(campaignId);
      if (!campaign) {
        return {
          success: false,
          sent: 0,
          failed: 0,
          message: "Campaign not found",
        };
      }

      if (campaign.status !== "draft" && campaign.status !== "scheduled") {
        return {
          success: false,
          sent: 0,
          failed: 0,
          message: `Campaign status is ${campaign.status}`,
        };
      }

      // Validate recipients exist
      if (!campaign.recipientEmails || campaign.recipientEmails.length === 0) {
        return {
          success: false,
          sent: 0,
          failed: 0,
          message: "No recipients configured for this campaign",
        };
      }

      // Update status
      await EmailCampaign.findByIdAndUpdate(campaignId, {
        status: "sending",
        sentAt: new Date(),
        totalRecipients: campaign.recipientEmails.length,
      });

      // Add recipients to queue before processing
      await this.queueManager.addToQueue(campaignId, campaign.recipientEmails);

      // Process queue
      const result = await this.queueManager.processQueue(campaignId);

      // Update analytics.sent on the campaign
      await EmailCampaign.findByIdAndUpdate(campaignId, {
        $inc: { "analytics.sent": result.sent },
      });

      return {
        success: true,
        sent: result.sent,
        failed: result.failed,
        message: `Campaign sent to ${result.sent} recipients`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, sent: 0, failed: 0, message };
    }
  }

  /**
   * Send test email
   */
  async sendTestEmail(
    campaignId: string,
    testEmail: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await dbConnect();

      const campaign = await EmailCampaign.findById(campaignId);
      if (!campaign) {
        return { success: false, message: "Campaign not found" };
      }

      const transporterManager = new TransporterManager();
      const transporter = await transporterManager.getTransporter(
        campaign.userId.toString(),
      );

      const mailOptions = {
        from: `${campaign.fromName} <${campaign.fromEmail}>`,
        to: testEmail,
        subject: `[TEST] ${campaign.subject}`,
        html: campaign.htmlContent,
        text: campaign.textContent || "",
      };

      await transporter.sendMail(mailOptions);

      return { success: true, message: `Test email sent to ${testEmail}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, message };
    }
  }
}

// Export singleton instance
export const emailMarketingEngine = new EmailMarketingEngine();
