import { generateKeyPairSync, createSign } from "crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDbConnect = vi.fn();
const mockQueueFindOne = vi.fn();
const mockQueueFindByIdAndUpdate = vi.fn();
const mockTrackingEventCreate = vi.fn();
const mockCampaignFindByIdAndUpdate = vi.fn();

vi.mock("@/lib/connectdb", () => ({ default: mockDbConnect }));
vi.mock("@/models/emailCampaign", () => ({
  EmailQueue: {
    findOne: mockQueueFindOne,
    findByIdAndUpdate: mockQueueFindByIdAndUpdate,
  },
  EmailTrackingEvent: { create: mockTrackingEventCreate },
  EmailCampaign: { findByIdAndUpdate: mockCampaignFindByIdAndUpdate },
}));

const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
});
const PUBLIC_KEY_BASE64 = publicKey
  .export({ type: "spki", format: "der" })
  .toString("base64");

vi.mock("@/lib/env", () => ({
  env: { SENDGRID_WEBHOOK_PUBLIC_KEY: PUBLIC_KEY_BASE64 },
}));

function sign(timestamp: string, body: string) {
  const signer = createSign("SHA256");
  signer.update(timestamp + body);
  signer.end();
  return signer.sign(privateKey).toString("base64");
}

function makeRequest(events: unknown[], timestamp = String(Math.floor(Date.now() / 1000))) {
  const rawBody = JSON.stringify(events);
  const signature = sign(timestamp, rawBody);
  return new NextRequest(
    "https://example.com/api/marketing/email/webhooks/sendgrid",
    {
      method: "POST",
      headers: {
        "x-twilio-email-event-webhook-signature": signature,
        "x-twilio-email-event-webhook-timestamp": timestamp,
      },
      body: rawBody,
    },
  );
}

describe("POST /api/marketing/email/webhooks/sendgrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbConnect.mockResolvedValue(undefined);
    mockQueueFindByIdAndUpdate.mockResolvedValue(undefined);
    mockTrackingEventCreate.mockResolvedValue(undefined);
    mockCampaignFindByIdAndUpdate.mockResolvedValue(undefined);
  });

  it("rejects a request with a signature that doesn't verify", async () => {
    const { POST } = await import(
      "@/app/api/marketing/email/webhooks/sendgrid/route"
    );
    const req = makeRequest([{ event: "bounce", trackingToken: "tok-1" }]);
    // Corrupt the signature after it was correctly generated.
    const tamperedReq = new NextRequest(req.url, {
      method: "POST",
      headers: {
        "x-twilio-email-event-webhook-signature": "aW52YWxpZA==",
        "x-twilio-email-event-webhook-timestamp": req.headers.get(
          "x-twilio-email-event-webhook-timestamp",
        )!,
      },
      body: await req.text(),
    });

    const res = await POST(tamperedReq);
    expect(res.status).toBe(401);
    expect(mockQueueFindOne).not.toHaveBeenCalled();
  });

  it("rejects a stale (replayed) timestamp even with a valid signature shape", async () => {
    const { POST } = await import(
      "@/app/api/marketing/email/webhooks/sendgrid/route"
    );
    const staleTimestamp = String(Math.floor(Date.now() / 1000) - 3600);
    const req = makeRequest(
      [{ event: "bounce", trackingToken: "tok-1" }],
      staleTimestamp,
    );

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("marks the matching queue item bounced and increments campaign stats", async () => {
    mockQueueFindOne.mockResolvedValue({
      _id: "queue-1",
      campaignId: "campaign-1",
      status: "sent",
    });

    const { POST } = await import(
      "@/app/api/marketing/email/webhooks/sendgrid/route"
    );
    const req = makeRequest([
      {
        event: "bounce",
        trackingToken: "tok-1",
        reason: "550 mailbox unavailable",
        timestamp: 1700000000,
      },
    ]);

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockQueueFindByIdAndUpdate).toHaveBeenCalledWith(
      "queue-1",
      expect.objectContaining({
        status: "bounced",
        error: "550 mailbox unavailable",
      }),
    );
    expect(mockTrackingEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "bounced" }),
    );
    expect(mockCampaignFindByIdAndUpdate).toHaveBeenCalledWith(
      "campaign-1",
      { $inc: { "analytics.bounced": 1 } },
    );
  });

  it("marks a spam-report event as unsubscribed so future sends are actually suppressed", async () => {
    mockQueueFindOne.mockResolvedValue({
      _id: "queue-2",
      campaignId: "campaign-1",
      status: "sent",
    });

    const { POST } = await import(
      "@/app/api/marketing/email/webhooks/sendgrid/route"
    );
    const req = makeRequest([
      { event: "spamreport", trackingToken: "tok-2" },
    ]);

    await POST(req);

    expect(mockQueueFindByIdAndUpdate).toHaveBeenCalledWith(
      "queue-2",
      expect.objectContaining({ status: "unsubscribed" }),
    );
    expect(mockTrackingEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "complained" }),
    );
    expect(mockCampaignFindByIdAndUpdate).toHaveBeenCalledWith(
      "campaign-1",
      { $inc: { "analytics.complained": 1 } },
    );
  });

  it("does not double-process a retried event once already in the target state", async () => {
    mockQueueFindOne.mockResolvedValue({
      _id: "queue-3",
      campaignId: "campaign-1",
      status: "bounced", // already processed by an earlier delivery attempt
    });

    const { POST } = await import(
      "@/app/api/marketing/email/webhooks/sendgrid/route"
    );
    const req = makeRequest([{ event: "bounce", trackingToken: "tok-3" }]);

    await POST(req);

    expect(mockQueueFindByIdAndUpdate).not.toHaveBeenCalled();
    expect(mockCampaignFindByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("ignores events with no trackingToken instead of throwing", async () => {
    const { POST } = await import(
      "@/app/api/marketing/email/webhooks/sendgrid/route"
    );
    const req = makeRequest([{ event: "bounce" }]);

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockQueueFindOne).not.toHaveBeenCalled();
  });

  it("ignores non-bounce/complaint events (delivered, open, click)", async () => {
    const { POST } = await import(
      "@/app/api/marketing/email/webhooks/sendgrid/route"
    );
    const req = makeRequest([
      { event: "delivered", trackingToken: "tok-4" },
      { event: "open", trackingToken: "tok-4" },
    ]);

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockQueueFindOne).not.toHaveBeenCalled();
  });

  it("processes multiple events in one payload independently", async () => {
    mockQueueFindOne
      .mockResolvedValueOnce({ _id: "queue-a", campaignId: "c1", status: "sent" })
      .mockResolvedValueOnce({ _id: "queue-b", campaignId: "c1", status: "sent" });

    const { POST } = await import(
      "@/app/api/marketing/email/webhooks/sendgrid/route"
    );
    const req = makeRequest([
      { event: "bounce", trackingToken: "tok-a" },
      { event: "spamreport", trackingToken: "tok-b" },
    ]);

    await POST(req);

    expect(mockQueueFindByIdAndUpdate).toHaveBeenCalledTimes(2);
  });
});
