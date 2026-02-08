/**
 * Call Webhook Dispatcher
 * Fires webhooks for call events to configured external endpoints
 * (Zapier, custom webhooks).
 *
 * Uses the existing WebhookManager infrastructure for dispatch,
 * retry, and signature signing.
 */

import { WebhookManager } from "@/lib/integrations/webhookHandler";
import type { WebhookPayload } from "@/lib/integrations/webhookHandler";
import WebhookConfigModel from "@/models/webhookConfig";
import { debugLog } from "@/utils/callHandlers";

type CallWebhookEvent =
  | "callForwarded"
  | "callCompleted"
  | "callVoicemail"
  | "callRefunded";

interface CallEventData {
  callSid: string;
  from: string;
  to: string;
  status: string;
  industry?: string;
  buyerId?: string;
  buyerName?: string;
  callDuration?: number;
  unitsCharged?: number;
  recordingUrl?: string;
  forwardingType?: string;
  paymentStatus?: string;
  voicemailDuration?: number;
  refundAmount?: number;
  refundComment?: string;
  [key: string]: unknown;
}

/**
 * Dispatch call event webhooks to all active configurations for a seller.
 * Non-blocking — errors are logged but never thrown to avoid disrupting call flow.
 */
export async function dispatchCallWebhook(
  sellerId: string,
  event: CallWebhookEvent,
  data: CallEventData,
): Promise<void> {
  try {
    // Find all active webhook configs for this seller that have the event enabled
    const webhookConfigs = await WebhookConfigModel.find({
      userId: sellerId,
      isActive: true,
      [`events.${event}`]: true,
    }).lean();

    if (webhookConfigs.length === 0) {
      return; // No webhooks configured for this event — silent exit
    }

    debugLog(
      `Dispatching ${event} webhook to ${webhookConfigs.length} endpoint(s)`,
      {
        sellerId,
        callSid: data.callSid,
      },
    );

    const payload: WebhookPayload = {
      type: "call",
      action: event === "callForwarded" ? "created" : "updated",
      data: {
        event,
        ...data,
      },
      source: "internal",
      timestamp: new Date(),
    };

    // Dispatch to all configured endpoints in parallel
    const dispatches = webhookConfigs.map(async (config) => {
      try {
        const webhookConfig = {
          id: config._id?.toString() || "",
          userId: config.userId?.toString() || "",
          url: config.url,
          source: config.source as "zapier" | "custom",
          secret: config.secret,
          isActive: config.isActive,
          events: config.events,
          headers: config.headers
            ? Object.fromEntries(
                config.headers instanceof Map
                  ? config.headers
                  : Object.entries(config.headers),
              )
            : undefined,
          maxRetriesPerEvent: config.maxRetriesPerEvent,
          retryDelaySeconds: config.retryDelaySeconds,
        };

        const result = await WebhookManager.dispatchWithRetry(
          webhookConfig,
          payload,
        );

        // Update webhook config stats
        if (result.success) {
          await WebhookConfigModel.findByIdAndUpdate(config._id, {
            $inc: { totalDispatched: 1, successCount: 1 },
            lastDispatchedAt: new Date(),
          });
        } else {
          await WebhookConfigModel.findByIdAndUpdate(config._id, {
            $inc: { totalDispatched: 1, failureCount: 1 },
            lastErrorAt: new Date(),
            lastErrorMessage: result.error,
          });
        }

        return result;
      } catch (error) {
        debugLog(
          `Webhook dispatch failed for config ${config._id}`,
          { error },
          "warn",
        );
      }
    });

    // Fire-and-forget — don't await all dispatches to avoid blocking call flow
    Promise.allSettled(dispatches).then((results) => {
      const succeeded = results.filter(
        (r) => r.status === "fulfilled" && r.value?.success,
      ).length;
      debugLog(
        `Call webhook ${event}: ${succeeded}/${results.length} succeeded`,
        {
          callSid: data.callSid,
        },
      );
    });
  } catch (error) {
    // Never throw — webhooks must not disrupt call handling
    debugLog(
      "Call webhook dispatch error",
      { error, event, sellerId },
      "error",
    );
  }
}
