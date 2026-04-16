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
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

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
      return badRequest(
        "Missing required headers: x-webhook-id, x-webhook-signature",
      );
    }

    // Validate webhook ID format
    if (!webhookId || !webhookId.match(/^[0-9a-fA-F]{24}$/)) {
      return badRequest("Invalid webhook ID format");
    }

    // Fetch webhook configuration
    const webhook = await WebhookConfig.findById(webhookId);
    if (!webhook) {
      return notFound("Webhook");
    }

    if (!webhook.isActive) {
      return forbidden("Webhook is inactive");
    }

    // Parse request body
    let payload: Record<string, unknown>;
    try {
      payload = await req.json();
    } catch {
      return badRequest("Invalid JSON in request body");
    }

    // Decrypt secret
    let secret: string;
    try {
      secret = decryptData(webhook.secret);
    } catch (error) {
      console.error("Error decrypting webhook secret:", error);
      return internalError("Internal server error");
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
      return unauthorized("Invalid signature");
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
      return forbidden("This webhook is not configured for this event type");
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
      return badRequest("Rate limit exceeded (per minute)", {
        limit: webhook.rateLimit.maxPerMinute,
      });
    }

    if (
      webhook.rateLimit?.maxPerHour &&
      hourlyLogs.length >= webhook.rateLimit.maxPerHour
    ) {
      return badRequest("Rate limit exceeded (per hour)", {
        limit: webhook.rateLimit.maxPerHour,
      });
    }

    // Process the webhook
    const result = await WebhookManager.processIncoming(req, {
      secret,
      isActive: webhook.isActive,
    });

    if (!result.success) {
      return badRequest(result.error || "Failed to process webhook", {
        message: result.message,
      });
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
    return internalError("Internal server error");
  }
}

/**
 * GET /api/integrations/webhooks/incoming
 * Verify webhook endpoint is active (for external service health checks)
 */
export async function GET() {
  return NextResponse.json({
    status: "active",
    message: "Webhook endpoint is ready to receive webhooks",
    timestamp: new Date(),
  });
}
