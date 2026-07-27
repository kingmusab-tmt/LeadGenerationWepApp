import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { EmailCampaign, EmailQueue, EmailTrackingEvent } from "@/models/emailCampaign";
import {
  isTimestampFresh,
  verifySendGridSignature,
} from "@/lib/security/sendgridWebhook";
import { env } from "@/lib/env";

/**
 * POST /api/marketing/email/webhooks/sendgrid
 *
 * Receives SendGrid's Event Webhook — the async bounce/complaint feedback
 * loop that R-18's synchronous SMTP-response check can't provide, since
 * most real-world bounces and spam complaints arrive after the SMTP
 * transaction already completed successfully.
 *
 * Only correlatable for sellers whose configured SMTP host is SendGrid's
 * relay (smtp.sendgrid.net) — see TransporterManager.isSendGrid in
 * lib/emailMarketingEngine.ts, which tags outgoing mail with SendGrid's
 * legacy X-SMTPAPI unique_args header so the trackingToken comes back on
 * every event here. A seller on a different SMTP provider has no
 * equivalent feed; this route simply has nothing to correlate for them.
 *
 * No session/CSRF applies here (this is an unauthenticated external
 * webhook, same as the Stripe/Twilio webhooks) — the ECDSA signature
 * check below is what actually authenticates the request.
 */

interface SendGridEvent {
  event: string;
  email?: string;
  sg_event_id?: string;
  sg_message_id?: string;
  trackingToken?: string;
  campaignId?: string;
  reason?: string;
  timestamp?: number;
}

const BOUNCE_EVENTS = new Set(["bounce", "dropped"]);
const COMPLAINT_EVENTS = new Set(["spamreport"]);

export async function POST(req: NextRequest) {
  if (!env.SENDGRID_WEBHOOK_PUBLIC_KEY) {
    console.error(
      "[SendGridWebhook] SENDGRID_WEBHOOK_PUBLIC_KEY not configured — rejecting event rather than trusting an unverifiable request",
    );
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 },
    );
  }

  const signature = req.headers.get("x-twilio-email-event-webhook-signature");
  const timestamp = req.headers.get("x-twilio-email-event-webhook-timestamp");

  if (!signature || !timestamp) {
    return NextResponse.json(
      { error: "Missing signature headers" },
      { status: 401 },
    );
  }

  if (!isTimestampFresh(timestamp)) {
    return NextResponse.json({ error: "Stale timestamp" }, { status: 401 });
  }

  // Must verify against the exact raw bytes — read as text, not json(),
  // and parse manually afterward.
  const rawBody = await req.text();

  const validSignature = verifySendGridSignature({
    publicKeyBase64: env.SENDGRID_WEBHOOK_PUBLIC_KEY,
    rawBody,
    signature,
    timestamp,
  });

  if (!validSignature) {
    console.error("[SendGridWebhook] Invalid signature — rejecting event");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let events: SendGridEvent[];
  try {
    const parsed = JSON.parse(rawBody);
    events = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await dbConnect();

  for (const event of events) {
    try {
      await processEvent(event);
    } catch (error) {
      // One malformed/unmatched event must not stop the rest of the batch
      // from being processed, or cause SendGrid to retry events we already
      // handled successfully.
      console.error(
        "[SendGridWebhook] Failed to process event:",
        event?.sg_event_id,
        error,
      );
    }
  }

  return NextResponse.json({ success: true });
}

async function processEvent(event: SendGridEvent): Promise<void> {
  const isBounce = BOUNCE_EVENTS.has(event.event);
  const isComplaint = COMPLAINT_EVENTS.has(event.event);
  if (!isBounce && !isComplaint) {
    // delivered/open/click/etc. are already tracked via our own tracking
    // pixel/link redirects — this webhook only handles the feedback our
    // own infrastructure can't observe.
    return;
  }

  const trackingToken = event.trackingToken;
  if (!trackingToken) {
    console.warn(
      "[SendGridWebhook] Event has no trackingToken, cannot correlate to a campaign send:",
      event.event,
      event.email,
    );
    return;
  }

  const queueItem = await EmailQueue.findOne({ trackingToken });
  if (!queueItem) {
    console.warn(
      "[SendGridWebhook] No EmailQueue item found for trackingToken:",
      trackingToken,
    );
    return;
  }

  // SendGrid's webhook delivery is at-least-once, not exactly-once — if
  // this item is already in the terminal state this event would produce,
  // skip it so a retried delivery can't double-increment campaign stats.
  const targetStatus = isBounce ? "bounced" : "unsubscribed";
  if (queueItem.status === targetStatus) return;

  const eventType = isBounce ? "bounced" : "complained";
  const statKey = isBounce ? "bounced" : "complained";

  await EmailQueue.findByIdAndUpdate(queueItem._id, {
    status: targetStatus,
    error:
      event.reason ||
      (isBounce ? "Bounced (SendGrid)" : "Marked as spam (SendGrid)"),
    lastAttempt: new Date(),
  });

  await EmailTrackingEvent.create({
    queueId: queueItem._id,
    campaignId: queueItem.campaignId,
    eventType,
    timestamp: event.timestamp ? new Date(event.timestamp * 1000) : new Date(),
  });

  await EmailCampaign.findByIdAndUpdate(queueItem.campaignId, {
    $inc: { [`analytics.${statKey}`]: 1 },
  });
}
