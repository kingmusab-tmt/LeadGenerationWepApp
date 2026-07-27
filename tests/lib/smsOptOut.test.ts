import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCampaignFindById = vi.fn();
const mockCampaignFindByIdAndUpdate = vi.fn();
const mockSegmentFindById = vi.fn();
const mockQueueExists = vi.fn();
const mockQueueInsertMany = vi.fn();
const mockQueueFind = vi.fn();
const mockQueueCountDocuments = vi.fn();
const mockEventFind = vi.fn();
const mockEventCreate = vi.fn();
const mockUserFindById = vi.fn();

vi.mock("@/lib/connectdb", () => ({ default: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/models", () => ({ User: { findById: mockUserFindById } }));
vi.mock("@/models/smsCampaign", () => ({
  SmsCampaign: {
    findById: mockCampaignFindById,
    findByIdAndUpdate: mockCampaignFindByIdAndUpdate,
  },
  SmsSegment: { findById: mockSegmentFindById },
  SmsQueue: {
    exists: mockQueueExists,
    insertMany: mockQueueInsertMany,
    find: mockQueueFind,
    findByIdAndUpdate: vi.fn(),
    countDocuments: mockQueueCountDocuments,
  },
  SmsEvent: { find: mockEventFind, create: mockEventCreate },
}));

const USER_ID = "seller-1";

function findChain(result: unknown) {
  return {
    sort: () => ({
      select: () => ({ lean: () => Promise.resolve(result) }),
    }),
  };
}

describe("SMS campaign send/resume — opt-out enforcement and dedup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindById.mockResolvedValue({
      apiSettings: {
        twilioSid: "AC_fake",
        twilioAuthToken: "fake_token",
        twilioPhoneNumber: "+15550000000",
      },
    });
    mockCampaignFindById.mockResolvedValue({
      _id: "campaign-1",
      userId: USER_ID,
      segmentId: undefined,
      recipients: [
        { phone: "+15551110001" },
        { phone: "+15551110002" },
        { phone: "+15551110003" },
      ],
      textContent: "Hello {{name}}",
      fromPhoneNumber: undefined,
      stats: { sent: 0, failed: 0 },
    });
    mockCampaignFindByIdAndUpdate.mockResolvedValue(undefined);
    mockEventCreate.mockResolvedValue(undefined);
    // No pending queue items to actually send during processBatch — this
    // isolates the enqueue/opt-out logic under test from the send loop.
    mockQueueFind.mockReturnValue({
      sort: () => ({ limit: () => Promise.resolve([]) }),
    });
    mockQueueCountDocuments.mockResolvedValue(0);
    mockQueueInsertMany.mockResolvedValue([]);
  });

  it("excludes recipients who opted out from the queue on first send", async () => {
    mockQueueExists.mockResolvedValue(null); // first send, nothing queued yet
    mockEventFind.mockReturnValue(
      findChain([
        { phone: "+15551110002", type: "optout" },
      ]),
    );

    const { smsMarketingEngine } = await import("@/lib/smsMarketingEngine");
    await smsMarketingEngine.sendCampaignImmediate("campaign-1");

    expect(mockQueueInsertMany).toHaveBeenCalledTimes(1);
    const queuedDocs = mockQueueInsertMany.mock.calls[0][0] as Array<{
      recipient: { phone: string };
    }>;
    const queuedPhones = queuedDocs.map((d) => d.recipient.phone);
    expect(queuedPhones).toEqual(["+15551110001", "+15551110003"]);
    expect(queuedPhones).not.toContain("+15551110002");
  });

  it("re-includes a recipient whose most recent event is an opt-in after a prior opt-out", async () => {
    mockQueueExists.mockResolvedValue(null);
    mockEventFind.mockReturnValue(
      findChain([
        { phone: "+15551110002", type: "optout" },
        { phone: "+15551110002", type: "optin" }, // texted START again, later
      ]),
    );

    const { smsMarketingEngine } = await import("@/lib/smsMarketingEngine");
    await smsMarketingEngine.sendCampaignImmediate("campaign-1");

    const queuedDocs = mockQueueInsertMany.mock.calls[0][0] as Array<{
      recipient: { phone: string };
    }>;
    const queuedPhones = queuedDocs.map((d) => d.recipient.phone);
    expect(queuedPhones).toContain("+15551110002");
  });

  it("does not re-enqueue (and duplicate-text everyone) when resuming an already-queued campaign", async () => {
    mockQueueExists.mockResolvedValue({ _id: "existing-queue-item" }); // resume case
    mockEventFind.mockReturnValue(findChain([]));

    const { smsMarketingEngine } = await import("@/lib/smsMarketingEngine");
    await smsMarketingEngine.sendCampaignImmediate("campaign-1");

    expect(mockQueueInsertMany).not.toHaveBeenCalled();
  });
});
