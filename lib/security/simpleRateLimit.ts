import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// Previously this was a per-process in-memory Map, which does not work as
// a real rate limiter once the app runs on more than one instance (every
// instance gets its own counter, and a redeploy resets it) — see
// lib/security/callSecurity.ts's checkCallRateLimit for the same pattern
// already used for Twilio call routes. This backs the same fixed-window
// counter semantics with Upstash Redis so a limit is actually shared
// across instances, with an in-memory fallback (same behavior as before)
// if Upstash isn't configured or is temporarily unreachable.

let redisClient: Redis | null = null;

// Circuit breaker: fall back to the in-memory limiter for 5 minutes after
// an Upstash failure, instead of retrying (and re-timing-out) on every
// request while Upstash is down.
let circuitOpen = false;
let circuitOpenUntil = 0;
const CIRCUIT_COOLDOWN_MS = 5 * 60 * 1000;
const RATE_LIMIT_TIMEOUT_MS = 1500;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return null;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "unknown";
}

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

// Used when Upstash isn't configured/reachable — matches the exact
// behavior this module had before (per-instance only), rather than
// disabling rate limiting entirely.
const FALLBACK_STORE = new Map<string, RateLimitEntry>();

function checkFallback(
  key: string,
  windowMs: number,
): { count: number; resetAt: number } {
  const now = Date.now();

  if (FALLBACK_STORE.size >= 2000) {
    for (const [k, entry] of FALLBACK_STORE.entries()) {
      if (entry.resetAt <= now) FALLBACK_STORE.delete(k);
    }
  }

  const existing = FALLBACK_STORE.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    FALLBACK_STORE.set(key, { count: 1, resetAt });
    return { count: 1, resetAt };
  }

  existing.count += 1;
  FALLBACK_STORE.set(key, existing);
  return { count: existing.count, resetAt: existing.resetAt };
}

async function checkDistributed(
  key: string,
  windowMs: number,
): Promise<{ count: number; resetAt: number }> {
  const redis = getRedis();
  if (!redis) {
    return checkFallback(key, windowMs);
  }

  try {
    const [count, ttlMs] = await Promise.race([
      Promise.all([redis.incr(key), redis.pttl(key)]),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Rate limit check timed out")),
          RATE_LIMIT_TIMEOUT_MS,
        ),
      ),
    ]);

    let resetAt: number;
    if (count === 1 || ttlMs < 0) {
      // First hit in this window (or the key somehow has no TTL yet) —
      // arm the expiry so the counter resets after windowMs.
      await redis.pexpire(key, windowMs);
      resetAt = Date.now() + windowMs;
    } else {
      resetAt = Date.now() + ttlMs;
    }

    circuitOpen = false;
    return { count, resetAt };
  } catch (error) {
    circuitOpen = true;
    circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
    console.warn(
      "[RateLimit] Upstash check failed — falling back to in-memory for 5 min:",
      error instanceof Error ? error.message : error,
    );
    return checkFallback(key, windowMs);
  }
}

export async function checkSimpleRateLimit(
  req: NextRequest,
  options: {
    scope: string;
    limit: number;
    windowMs: number;
    actorId?: string;
  },
): Promise<NextResponse | null> {
  const actor = options.actorId || getClientIp(req);
  const key = `simple-rl:${options.scope}:${actor}`;

  const useFallbackOnly = circuitOpen && Date.now() < circuitOpenUntil;
  const { count, resetAt } = useFallbackOnly
    ? checkFallback(key, options.windowMs)
    : await checkDistributed(key, options.windowMs);

  if (count <= options.limit) {
    return null;
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((resetAt - Date.now()) / 1000),
  );

  return NextResponse.json(
    {
      success: false,
      error: "Too many requests",
      retryAfter: retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": retryAfterSeconds.toString(),
        "X-RateLimit-Limit": options.limit.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": resetAt.toString(),
      },
    },
  );
}
