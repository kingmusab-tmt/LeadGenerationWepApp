import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import twilio from "twilio";

// ============================================
// RATE LIMITING FOR CALL ENDPOINTS
// ============================================

let callRateLimiter: Ratelimit | null = null;

// Circuit breaker: skip rate limiting for 5 minutes after a failure
let circuitOpen = false;
let circuitOpenUntil = 0;
const CIRCUIT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_TIMEOUT_MS = 1500; // 1.5s max for rate limit check

function getCallRateLimiter(): Ratelimit | null {
  if (callRateLimiter) return callRateLimiter;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    console.warn(
      "[CallSecurity] Upstash Redis not configured - rate limiting disabled",
    );
    return null;
  }

  callRateLimiter = new Ratelimit({
    redis: new Redis({ url: redisUrl, token: redisToken }),
    limiter: Ratelimit.slidingWindow(60, "1 m"), // 60 requests per minute per IP
    analytics: true,
    prefix: "calls-ratelimit",
  });

  return callRateLimiter;
}

/**
 * Rate limit check for call API endpoints.
 * Returns null if allowed, or a NextResponse if rate limited.
 * Includes a circuit breaker (skips for 5 min after failure) and
 * a 1.5s timeout so a DNS/network failure doesn't stall the request.
 */
export async function checkCallRateLimit(
  req: NextRequest,
): Promise<NextResponse | null> {
  // Circuit breaker: skip if Upstash was recently unreachable
  if (circuitOpen) {
    if (Date.now() < circuitOpenUntil) return null;
    // Cooldown expired — allow one probe attempt
    circuitOpen = false;
  }

  const limiter = getCallRateLimiter();
  if (!limiter) return null; // No rate limiter configured - allow

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  try {
    // Race the rate-limit call against a timeout so a DNS/network
    // failure cannot stall the entire request for seconds.
    const result = await Promise.race([
      limiter.limit(ip),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Rate limit check timed out")),
          RATE_LIMIT_TIMEOUT_MS,
        ),
      ),
    ]);

    const { success, limit, reset } = result;

    if (!success) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
          retryAfter: Math.ceil((reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": reset.toString(),
            "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        },
      );
    }

    return null; // Allowed
  } catch (error) {
    // Open the circuit so subsequent requests skip the broken limiter
    circuitOpen = true;
    circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
    console.warn(
      "[CallSecurity] Rate limit check failed — circuit open for 5 min:",
      error instanceof Error ? error.message : error,
    );
    return null; // Fail open - don't block on rate limit errors
  }
}

// ============================================
// TWILIO WEBHOOK SIGNATURE VALIDATION
// ============================================

/**
 * Validates that an incoming request is genuinely from Twilio
 * by checking the X-Twilio-Signature header against the request body.
 *
 * @param req - The incoming Next.js request
 * @returns true if valid, false if invalid or validation skipped
 */
export async function validateTwilioWebhook(req: NextRequest): Promise<{
  valid: boolean;
  error?: string;
}> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken) {
    console.warn(
      "[CallSecurity] TWILIO_AUTH_TOKEN not set - webhook validation skipped",
    );
    return { valid: true }; // Skip validation if token not configured
  }

  const signature = req.headers.get("x-twilio-signature");

  if (!signature) {
    // In development, allow unsigned requests
    if (process.env.NODE_ENV === "development") {
      return { valid: true };
    }
    return { valid: false, error: "Missing X-Twilio-Signature header" };
  }

  try {
    const url = `https://${process.env.NEXT_PUBLIC_DOMAIN}${new URL(req.url).pathname}${new URL(req.url).search}`;

    // Clone request and read the body as form data for validation
    const clonedReq = req.clone();
    const formData = await clonedReq.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const isValid = twilio.validateRequest(authToken, signature, url, params);

    if (!isValid) {
      console.error("[CallSecurity] Invalid Twilio signature", {
        url,
        signature: signature.substring(0, 10) + "...",
      });
      return { valid: false, error: "Invalid Twilio signature" };
    }

    return { valid: true };
  } catch (error) {
    console.error("[CallSecurity] Webhook validation error:", error);
    // In development, allow the request through
    if (process.env.NODE_ENV === "development") {
      return { valid: true };
    }
    return { valid: false, error: "Webhook validation failed" };
  }
}

/**
 * Combined middleware that checks both rate limiting and webhook validation.
 * Returns null if all checks pass, or a NextResponse with an error.
 */
export async function callSecurityMiddleware(
  req: NextRequest,
  options: { validateWebhook?: boolean; rateLimit?: boolean } = {},
): Promise<NextResponse | null> {
  const { validateWebhook = false, rateLimit = true } = options;

  // Rate limit check
  if (rateLimit) {
    const rateLimitResponse = await checkCallRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;
  }

  // Webhook validation (for Twilio-originating requests)
  if (validateWebhook) {
    const { valid, error } = await validateTwilioWebhook(req);
    if (!valid) {
      return NextResponse.json(
        { error: "Unauthorized", message: error },
        { status: 403 },
      );
    }
  }

  return null; // All checks passed
}

// ============================================
// CALL CONFIGURATION DEFAULTS
// ============================================

/**
 * Default call configuration values used across the system.
 * These can be overridden per-seller via their settings.
 */
export const CALL_DEFAULTS = {
  /** Max time (seconds) to wait for a buyer to pick up before trying next */
  dialTimeout: 30,
  /** Max number of retry attempts for unanswered calls */
  maxRetryAttempts: 3,
  /** Min call duration (seconds) before charging applies */
  minBillableDuration: 15,
  /** Default call rate if seller hasn't configured one */
  defaultCallRate: { units: 1, seconds: 60 },
  /** Max recording duration in seconds (Twilio limit) */
  maxRecordingDuration: 3600,
  /** Pause between sequential forwarding attempts (seconds) */
  forwardingPauseDuration: 1,
  /** Default voicemail timeout before recording starts (seconds) */
  voicemailTimeout: 25,
  /** Max voicemail recording length (seconds) */
  voicemailMaxLength: 120,
  /** Hold music timeout before disconnecting (seconds) */
  holdMusicTimeout: 300,
} as const;

/**
 * Get call configuration for a seller, with defaults applied.
 */
export function getCallConfig(sellerSettings?: {
  dialTimeout?: number;
  maxRetryAttempts?: number;
  minBillableDuration?: number;
}) {
  return {
    dialTimeout: sellerSettings?.dialTimeout || CALL_DEFAULTS.dialTimeout,
    maxRetryAttempts:
      sellerSettings?.maxRetryAttempts || CALL_DEFAULTS.maxRetryAttempts,
    minBillableDuration:
      sellerSettings?.minBillableDuration || CALL_DEFAULTS.minBillableDuration,
  };
}
