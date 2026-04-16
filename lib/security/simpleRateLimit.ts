import { NextRequest, NextResponse } from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const STORE = new Map<string, RateLimitEntry>();

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "unknown";
}

function cleanupIfNeeded(now: number): void {
  if (STORE.size < 2000) {
    return;
  }

  for (const [key, entry] of STORE.entries()) {
    if (entry.resetAt <= now) {
      STORE.delete(key);
    }
  }
}

export function checkSimpleRateLimit(
  req: NextRequest,
  options: {
    scope: string;
    limit: number;
    windowMs: number;
    actorId?: string;
  },
): NextResponse | null {
  const now = Date.now();
  cleanupIfNeeded(now);

  const actor = options.actorId || getClientIp(req);
  const key = `${options.scope}:${actor}`;

  const existing = STORE.get(key);
  if (!existing || existing.resetAt <= now) {
    STORE.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return null;
  }

  if (existing.count >= options.limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000),
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
          "X-RateLimit-Reset": existing.resetAt.toString(),
        },
      },
    );
  }

  existing.count += 1;
  STORE.set(key, existing);
  return null;
}
