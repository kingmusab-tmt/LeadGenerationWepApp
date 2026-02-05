/**
 * Webhook Handler
 * Manages webhook creation, verification, dispatch, and processing
 * Supports multiple sources: Zapier, HubSpot, Salesforce,  custom
 *
 * Date: January 21, 2026
 */

import crypto from "crypto";
import { NextResponse } from "next/server";

/**
 * Webhook event payload structure
 */
export interface WebhookPayload {
  type: "lead" | "deal" | "contact" | "event" | "call" | "assignment";
  action: "created" | "updated" | "deleted" | "accepted" | "rejected";
  data: Record<string, unknown>;
  source: "zapier" | "hubspot" | "salesforce" | "internal";
  timestamp: Date;
  signature?: string; // HMAC signature for verification
  retryCount?: number; // For retry tracking
}

/**
 * Webhook configuration stored in database
 */
export interface WebhookConfig {
  id: string;
  userId: string; // Seller/User ID
  url: string;
  source: "zapier" | "hubspot" | "salesforce" | "custom";
  secret: string; // For HMAC signing
  isActive: boolean;

  // Events to trigger
  events: {
    leadCreated?: boolean;
    leadUpdated?: boolean;
    leadQualified?: boolean;
    leadAccepted?: boolean;
    leadRejected?: boolean;
    buyerAssigned?: boolean;
    callCompleted?: boolean;
    dealCreated?: boolean;
    dealUpdated?: boolean;
  };

  // Headers to include
  headers?: Record<string, string>;

  // Rate limiting
  maxRetriesPerEvent?: number;
  retryDelaySeconds?: number;

  // Statistics
  totalDispatched?: number;
  successCount?: number;
  failureCount?: number;
  lastDispatchedAt?: Date;
  lastErrorAt?: Date;
  lastErrorMessage?: string;
}

/**
 * Webhook dispatch result
 */
export interface WebhookDispatchResult {
  success: boolean;
  statusCode?: number;
  responseBody?: Record<string, unknown>;
  error?: string;
  retryAfter?: number;
  timestamp: Date;
}

/**
 * Webhook Manager - Core webhook operations
 */
export class WebhookManager {
  private static readonly SIGNATURE_HEADER = "X-Webhook-Signature";
  private static readonly TIMESTAMP_HEADER = "X-Webhook-Timestamp";
  private static readonly RETRY_HEADER = "X-Webhook-Retry-Count";

  /**
   * Generate HMAC-SHA256 signature for webhook payload
   * Used for both creating and verifying signatures
   */
  static generateSignature(payload: string, secret: string): string {
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   * Prevents unauthorized webhook calls
   *
   * @param payload - Raw request body
   * @param signature - Signature from X-Webhook-Signature header
   * @param secret - Webhook secret (store encrypted in config)
   * @param timestampStr - Timestamp from X-Webhook-Timestamp header (optional)
   * @param maxAgeSeconds - Max age of timestamp to prevent replay attacks (default: 300s)
   * @returns true if signature is valid
   */
  static verifySignature(
    payload: string,
    signature: string,
    secret: string,
    timestampStr?: string,
    maxAgeSeconds: number = 300,
  ): boolean {
    try {
      // Verify HMAC signature
      const expectedSignature = this.generateSignature(payload, secret);
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );

      if (!isValid) return false;

      // Verify timestamp freshness (prevent replay attacks)
      if (timestampStr) {
        const timestamp = parseInt(timestampStr);
        const now = Date.now();
        const age = (now - timestamp) / 1000;

        if (age > maxAgeSeconds || age < 0) {
          console.warn(`Webhook timestamp too old or in future: ${age}s`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Signature verification error:", error);
      return false;
    }
  }

  /**
   * Send webhook to external endpoint
   * Includes retry logic and error handling
   *
   * @param config - Webhook configuration
   * @param payload - Webhook payload to send
   * @returns Dispatch result with status and error details
   */
  static async dispatch(
    config: WebhookConfig,
    payload: WebhookPayload,
  ): Promise<WebhookDispatchResult> {
    const payloadStr = JSON.stringify(payload);
    const signature = this.generateSignature(payloadStr, config.secret);
    const timestamp = Date.now();
    const retryCount = payload.retryCount || 0;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      [this.SIGNATURE_HEADER]: signature,
      [this.TIMESTAMP_HEADER]: timestamp.toString(),
      [this.RETRY_HEADER]: retryCount.toString(),
      ...(config.headers || {}),
    };

    try {
      const response = await fetch(config.url, {
        method: "POST",
        headers,
        body: payloadStr,
      });

      const responseBody = await response.json().catch(() => ({}));

      if (response.ok) {
        return {
          success: true,
          statusCode: response.status,
          responseBody,
          timestamp: new Date(),
        };
      }

      // Determine if retryable (5xx errors, specific 4xx errors)
      const isRetryable =
        response.status >= 500 ||
        response.status === 408 ||
        response.status === 429;

      return {
        success: false,
        statusCode: response.status,
        responseBody,
        error: `HTTP ${response.status}: ${
          typeof responseBody === "object"
            ? JSON.stringify(responseBody)
            : responseBody
        }`,
        retryAfter: isRetryable ? 60 : undefined, // Retry after 60s if retryable
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      return {
        success: false,
        error: `Dispatch failed: ${errorMessage}`,
        retryAfter: 60, // Always retry on network error
        timestamp: new Date(),
      };
    }
  }

  /**
   * Dispatch with automatic retry
   * Implements exponential backoff
   *
   * @param config - Webhook configuration
   * @param payload - Webhook payload
   * @param retryCount - Current retry attempt
   * @returns Final dispatch result
   */
  static async dispatchWithRetry(
    config: WebhookConfig,
    payload: WebhookPayload,
    retryCount: number = 0,
  ): Promise<WebhookDispatchResult> {
    const maxRetries = config.maxRetriesPerEvent || 3;
    const baseDelay = config.retryDelaySeconds || 60;

    const result = await this.dispatch(config, payload);

    if (result.success) {
      return result;
    }

    // Check if we should retry
    if (retryCount >= maxRetries) {
      console.error(
        `Webhook dispatch failed after ${maxRetries} retries:`,
        result.error,
      );
      return result;
    }

    // Calculate exponential backoff delay
    const delay = baseDelay * Math.pow(2, retryCount) * 1000; // exponential backoff in ms
    console.log(
      `Retrying webhook in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`,
    );

    // Schedule retry
    setTimeout(() => {
      payload.retryCount = retryCount + 1;
      this.dispatchWithRetry(config, payload, retryCount + 1);
    }, delay);

    return result;
  }

  /**
   * Process incoming webhook from external source
   * Validates signature and routes to appropriate handler
   *
   * @param req - Next.js request object
   * @param config - Webhook configuration
   * @returns Processing result or error response
   */
  static async processIncoming(
    req: Request,
    config: WebhookConfig,
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      // Verify signature
      const signature = req.headers.get(this.SIGNATURE_HEADER);
      const timestamp = req.headers.get(this.TIMESTAMP_HEADER);

      if (!signature) {
        return {
          success: false,
          message: "Missing signature header",
          error: "No X-Webhook-Signature provided",
        };
      }

      const bodyText = await req.text();

      if (
        !this.verifySignature(
          bodyText,
          signature,
          config.secret,
          timestamp || undefined,
        )
      ) {
        return {
          success: false,
          message: "Invalid signature",
          error: "Signature verification failed",
        };
      }

      // Parse payload
      let payload: WebhookPayload;
      try {
        const body = JSON.parse(bodyText);
        payload = {
          ...body,
          timestamp: new Date(body.timestamp || Date.now()),
        };
      } catch (parseError) {
        return {
          success: false,
          message: "Invalid JSON payload",
          error:
            parseError instanceof Error ? parseError.message : "Parse failed",
        };
      }

      // Validate payload structure
      if (!payload.type || !payload.action || !payload.data) {
        return {
          success: false,
          message: "Invalid webhook payload structure",
          error: "Missing required fields: type, action, or data",
        };
      }

      // Check if webhook is active
      if (!config.isActive) {
        return {
          success: false,
          message: "Webhook is disabled",
          error: "This webhook configuration is not active",
        };
      }

      // Check if this event type is configured
      const eventKey = `${payload.type}${payload.action
        .charAt(0)
        .toUpperCase()}${payload.action.slice(1)}` as keyof typeof config.events;
      if (config.events && !config.events[eventKey]) {
        return {
          success: false,
          message: "Event type not configured",
          error: `Event ${payload.type}.${payload.action} is not enabled for this webhook`,
        };
      }

      // Success - webhook is valid and will be processed
      return {
        success: true,
        message: `Webhook received and queued for processing`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        message: "Error processing webhook",
        error: errorMessage,
      };
    }
  }

  /**
   * Format webhook for logging/audit trail
   */
  static formatForLogging(
    payload: WebhookPayload,
    config: WebhookConfig,
    result: WebhookDispatchResult,
  ): Record<string, unknown> {
    return {
      timestamp: new Date().toISOString(),
      webhookId: config.id,
      source: config.source,
      eventType: `${payload.type}.${payload.action}`,
      success: result.success,
      statusCode: result.statusCode,
      errorMessage: result.error,
      retryAfter: result.retryAfter,
      dataSize: JSON.stringify(payload.data).length,
    };
  }
}

/**
 * Webhook response helper
 * Creates standardized webhook responses
 */
export class WebhookResponse {
  static success(message: string, data?: Record<string, unknown>) {
    return NextResponse.json(
      { success: true, message, ...data },
      { status: 200 },
    );
  }

  static created(message: string, data?: Record<string, unknown>) {
    return NextResponse.json(
      { success: true, message, ...data },
      { status: 201 },
    );
  }

  static badRequest(message: string, error?: string) {
    return NextResponse.json(
      { success: false, message, error },
      { status: 400 },
    );
  }

  static unauthorized(message: string = "Unauthorized") {
    return NextResponse.json({ success: false, message }, { status: 401 });
  }

  static forbidden(message: string = "Forbidden") {
    return NextResponse.json({ success: false, message }, { status: 403 });
  }

  static notFound(message: string = "Not found") {
    return NextResponse.json({ success: false, message }, { status: 404 });
  }

  static tooManyRequests(
    message: string = "Rate limit exceeded",
    retryAfter?: number,
  ) {
    const response = NextResponse.json(
      { success: false, message },
      { status: 429 },
    );
    if (retryAfter) {
      response.headers.set("Retry-After", retryAfter.toString());
    }
    return response;
  }

  static serverError(message: string, error?: string) {
    return NextResponse.json(
      { success: false, message, error },
      { status: 500 },
    );
  }
}

export default WebhookManager;
