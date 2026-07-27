import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("CSRF token generation and verification", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "test-signing-secret-do-not-use-in-prod");
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts a token verified against the same user it was minted for", async () => {
    const { generateCSRFToken, verifyCSRFToken } = await import("@/lib/csrf");
    const { token } = generateCSRFToken("user@example.com");

    expect(verifyCSRFToken(token, "user@example.com")).toBe(true);
  });

  it("rejects a token verified against a different user", async () => {
    const { generateCSRFToken, verifyCSRFToken } = await import("@/lib/csrf");
    const { token } = generateCSRFToken("user@example.com");

    expect(verifyCSRFToken(token, "attacker@example.com")).toBe(false);
  });

  it("rejects a tampered token", async () => {
    const { generateCSRFToken, verifyCSRFToken } = await import("@/lib/csrf");
    const { token } = generateCSRFToken("user@example.com");

    const tampered = token.slice(0, -2) + (token.slice(-2) === "aa" ? "bb" : "aa");

    expect(verifyCSRFToken(tampered, "user@example.com")).toBe(false);
  });

  it("rejects garbage input instead of throwing", async () => {
    const { verifyCSRFToken } = await import("@/lib/csrf");

    expect(verifyCSRFToken("not-a-real-token", "user@example.com")).toBe(false);
    expect(verifyCSRFToken("", "user@example.com")).toBe(false);
  });

  it("rejects an expired token", async () => {
    const { generateCSRFToken, verifyCSRFToken } = await import("@/lib/csrf");

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
    const { token } = generateCSRFToken("user@example.com");

    // Just past the 1-hour expiry window.
    nowSpy.mockReturnValue(1_000_000 + 3_600_001);
    expect(verifyCSRFToken(token, "user@example.com")).toBe(false);

    // Still within the window.
    nowSpy.mockReturnValue(1_000_000 + 3_599_000);
    expect(verifyCSRFToken(token, "user@example.com")).toBe(true);
  });

  it("produces a different token/signature on every call (nonce-based)", async () => {
    const { generateCSRFToken } = await import("@/lib/csrf");
    const first = generateCSRFToken("user@example.com");
    const second = generateCSRFToken("user@example.com");

    expect(first.token).not.toBe(second.token);
  });
});
