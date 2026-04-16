import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDbConnect = vi.fn();
const mockFindById = vi.fn();
const mockDecryptData = vi.fn();
const mockVerifySignature = vi.fn();
const mockProcessIncoming = vi.fn();

vi.mock("@/lib/connectdb", () => ({
  default: mockDbConnect,
}));

vi.mock("@/models/webhookConfig", () => ({
  WebhookConfig: {
    findById: mockFindById,
  },
}));

vi.mock("@/lib/encryption", () => ({
  decryptData: mockDecryptData,
}));

vi.mock("@/lib/integrations/webhookHandler", () => ({
  WebhookManager: {
    verifySignature: mockVerifySignature,
    processIncoming: mockProcessIncoming,
  },
}));

describe("/api/integrations/webhooks/incoming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbConnect.mockResolvedValue(undefined);
  });

  it("GET returns active endpoint status", async () => {
    const { GET } =
      await import("@/app/api/integrations/webhooks/incoming/route");

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("active");
    expect(body.message).toContain("ready to receive webhooks");
  });

  it("POST returns 400 when required headers are missing", async () => {
    const { POST } =
      await import("@/app/api/integrations/webhooks/incoming/route");
    const req = new NextRequest(
      "https://example.com/api/integrations/webhooks/incoming",
      {
        method: "POST",
        body: JSON.stringify({ type: "lead", action: "created" }),
        headers: { "content-type": "application/json" },
      },
    );

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain("Missing required headers");
  });

  it("POST returns 202 for valid, configured webhook payload", async () => {
    const { POST } =
      await import("@/app/api/integrations/webhooks/incoming/route");

    mockFindById.mockResolvedValue({
      secret: "encrypted-secret",
      isActive: true,
      events: { leadCreated: true },
      dispatchLogs: [],
      rateLimit: { maxPerMinute: 5, maxPerHour: 100 },
      recordDispatch: vi.fn().mockResolvedValue(undefined),
    });
    mockDecryptData.mockReturnValue("decrypted-secret");
    mockVerifySignature.mockReturnValue(true);
    mockProcessIncoming.mockResolvedValue({ success: true, message: "queued" });

    const req = new NextRequest(
      "https://example.com/api/integrations/webhooks/incoming",
      {
        method: "POST",
        body: JSON.stringify({ type: "lead", action: "created" }),
        headers: {
          "content-type": "application/json",
          "x-webhook-id": "507f1f77bcf86cd799439011",
          "x-webhook-signature": "valid-signature",
          "x-webhook-timestamp": `${Math.floor(Date.now() / 1000)}`,
        },
      },
    );

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(202);
    expect(body.success).toBe(true);
    expect(body.data.webhookId).toBe("507f1f77bcf86cd799439011");
    expect(mockVerifySignature).toHaveBeenCalled();
    expect(mockProcessIncoming).toHaveBeenCalled();
  });
});
