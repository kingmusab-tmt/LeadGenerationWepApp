import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { checkSimpleRateLimit } from "../lib/security/simpleRateLimit";

function makeRequest(): NextRequest {
  return new NextRequest("https://example.com/api/test", {
    headers: {
      "x-forwarded-for": "203.0.113.9",
    },
  });
}

describe("checkSimpleRateLimit", () => {
  it("allows requests under the configured limit", async () => {
    const req = makeRequest();
    const scope = `allow-${Date.now()}-${Math.random()}`;

    const first = await checkSimpleRateLimit(req, {
      scope,
      limit: 2,
      windowMs: 60_000,
      actorId: "actor-a",
    });
    const second = await checkSimpleRateLimit(req, {
      scope,
      limit: 2,
      windowMs: 60_000,
      actorId: "actor-a",
    });

    expect(first).toBeNull();
    expect(second).toBeNull();
  });

  it("returns 429 with retry metadata when limit is exceeded", async () => {
    const req = makeRequest();
    const scope = `block-${Date.now()}-${Math.random()}`;

    await checkSimpleRateLimit(req, {
      scope,
      limit: 2,
      windowMs: 60_000,
      actorId: "actor-b",
    });
    await checkSimpleRateLimit(req, {
      scope,
      limit: 2,
      windowMs: 60_000,
      actorId: "actor-b",
    });

    const blocked = await checkSimpleRateLimit(req, {
      scope,
      limit: 2,
      windowMs: 60_000,
      actorId: "actor-b",
    });

    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("X-RateLimit-Limit")).toBe("2");
    expect(blocked?.headers.get("X-RateLimit-Remaining")).toBe("0");

    const body = await blocked?.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Too many requests");
    expect(body.retryAfter).toBeGreaterThanOrEqual(1);
  });

  it("resets usage after the configured window expires", async () => {
    const req = makeRequest();
    const scope = `reset-${Date.now()}-${Math.random()}`;
    const nowSpy = vi.spyOn(Date, "now");

    nowSpy.mockReturnValue(1_000);
    const first = await checkSimpleRateLimit(req, {
      scope,
      limit: 1,
      windowMs: 10_000,
      actorId: "actor-c",
    });

    nowSpy.mockReturnValue(2_000);
    const blocked = await checkSimpleRateLimit(req, {
      scope,
      limit: 1,
      windowMs: 10_000,
      actorId: "actor-c",
    });

    nowSpy.mockReturnValue(11_500);
    const afterReset = await checkSimpleRateLimit(req, {
      scope,
      limit: 1,
      windowMs: 10_000,
      actorId: "actor-c",
    });

    expect(first).toBeNull();
    expect(blocked?.status).toBe(429);
    expect(afterReset).toBeNull();
  });
});
