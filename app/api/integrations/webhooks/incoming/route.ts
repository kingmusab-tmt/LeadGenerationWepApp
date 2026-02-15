/**
 * Incoming Webhook Handler API
 * POST /api/integrations/webhooks/incoming - Receive webhooks from external services
 *
 * This endpoint receives and processes incoming webhooks from:
 * - Zapier
 * - Custom webhooks
 * - Other services
 *
 * Date: January 21, 2026
 */

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { WebhookConfig } from "@/models/webhookConfig";
import { WebhookManager } from "@/lib/integrations/webhookHandler";
import { decryptData } from "@/lib/encryption";

export const dynamic = "force-dynamic";

/**
 * POST /api/integrations/webhooks/incoming
 * Receive webhook from external service
 *
 * Headers:
 * - x-webhook-id: Webhook configuration ID
 * - x-webhook-signature: HMAC-SHA256 signature
 * - x-webhook-timestamp: Unix timestamp (for replay protection)
 *
 * Body: JSON payload from external service
 */
export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    // Extract headers
    const webhookId = req.headers.get("x-webhook-id");
    const signature = req.headers.get("x-webhook-signature");
    const timestamp = req.headers.get("x-webhook-timestamp");

    if (!webhookId || !signature) {
      return NextResponse.json(
        {
          error: "Missing required headers: x-webhook-id, x-webhook-signature",
        },
        { status: 400 },
      );
    }

    // Validate webhook ID format
    if (!webhookId || !webhookId.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json(
        { error: "Invalid webhook ID format" },
        { status: 400 },
      );
    }

    // Fetch webhook configuration
    const webhook = await WebhookConfig.findById(webhookId);
    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    if (!webhook.isActive) {
      return NextResponse.json(
        { error: "Webhook is inactive" },
        { status: 403 },
      );
    }

    // Parse request body
    let payload: Record<string, unknown>;
    try {
      payload = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    // Decrypt secret
    let secret: string;
    try {
      secret = decryptData(webhook.secret);
    } catch (error) {
      console.error("Error decrypting webhook secret:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    // Verify signature with replay protection
    const maxAge = 5 * 60; // 5 minutes
    const payloadString = JSON.stringify(payload);
    const webhookTimestamp = timestamp ? parseInt(timestamp) : undefined;
    const isValid = WebhookManager.verifySignature(
      payloadString,
      signature,
      secret,
      webhookTimestamp?.toString(),
      maxAge,
    );

    if (!isValid) {
      console.warn("Invalid webhook signature for ID:", webhookId);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Determine event type from payload
    const eventType = payload.type || payload.event || "unknown";
    const eventAction = payload.action || "";

    // Check if this event is configured for this webhook
    const eventKey =
      eventType === "lead" && eventAction === "created"
        ? "leadCreated"
        : eventType === "lead" && eventAction === "updated"
          ? "leadUpdated"
          : eventType === "lead" && eventAction === "qualified"
            ? "leadQualified"
            : eventType === "lead" && eventAction === "accepted"
              ? "leadAccepted"
              : eventType === "lead" && eventAction === "rejected"
                ? "leadRejected"
                : eventType === "buyer"
                  ? "buyerAssigned"
                  : eventType === "call"
                    ? "callCompleted"
                    : eventType === "deal" && eventAction === "created"
                      ? "dealCreated"
                      : eventType === "deal" && eventAction === "updated"
                        ? "dealUpdated"
                        : null;

    if (eventKey && !webhook.events[eventKey as keyof typeof webhook.events]) {
      return NextResponse.json(
        {
          error: "This webhook is not configured for this event type",
          received: eventType,
          action: eventAction,
        },
        { status: 403 },
      );
    }

    // Check rate limits
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    const recentLogs = (webhook.dispatchLogs || []).filter(
      (log) => new Date(log.timestamp).getTime() > oneMinuteAgo,
    );
    const hourlyLogs = (webhook.dispatchLogs || []).filter(
      (log) => new Date(log.timestamp).getTime() > oneHourAgo,
    );

    if (
      webhook.rateLimit?.maxPerMinute &&
      recentLogs.length >= webhook.rateLimit.maxPerMinute
    ) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded (per minute)",
          limit: webhook.rateLimit.maxPerMinute,
        },
        { status: 429 },
      );
    }

    if (
      webhook.rateLimit?.maxPerHour &&
      hourlyLogs.length >= webhook.rateLimit.maxPerHour
    ) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded (per hour)",
          limit: webhook.rateLimit.maxPerHour,
        },
        { status: 429 },
      );
    }

    // Process the webhook
    const result = await WebhookManager.processIncoming(req, webhook as any);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Failed to process webhook",
          message: result.message,
        },
        { status: 400 },
      );
    }

    // Record successful dispatch
    await webhook.recordDispatch(true, 200, "Processed", 0);

    return NextResponse.json(
      {
        success: true,
        message: "Webhook received and queued for processing",
        data: {
          webhookId,
          eventType,
          processedAt: new Date(),
        },
      },
      { status: 202 }, // Accepted - async processing
    );
  } catch (error) {
    console.error("Error processing incoming webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/integrations/webhooks/incoming
 * Verify webhook endpoint is active (for external service health checks)
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "active",
    message: "Webhook endpoint is ready to receive webhooks",
    timestamp: new Date(),
  });
}
