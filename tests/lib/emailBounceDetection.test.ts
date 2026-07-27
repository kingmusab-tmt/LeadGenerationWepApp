import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDbConnect = vi.fn();
const mockUserFindById = vi.fn();
const mockCampaignFindById = vi.fn();
const mockCampaignFindByIdAndUpdate = vi.fn();
const mockQueueFind = vi.fn();
const mockQueueFindByIdAndUpdate = vi.fn();
const mockQueueCountDocuments = vi.fn();
const mockTrackingEventCreate = vi.fn();
const mockSendMail = vi.fn();
const mockVerify = vi.fn();

vi.mock("@/lib/connectdb", () => ({ default: mockDbConnect }));
vi.mock("@/models", () => ({ User: { findById: mockUserFindById } }));
vi.mock("@/models/emailCampaign", () => ({
  EmailCampaign: {
    findById: mockCampaignFindById,
    findByIdAndUpdate: mockCampaignFindByIdAndUpdate,
  },
  EmailQueue: {
    find: mockQueueFind,
    findByIdAndUpdate: mockQueueFindByIdAndUpdate,
    countDocuments: mockQueueCountDocuments,
  },
  EmailTrackingEvent: { create: mockTrackingEventCreate },
}));
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn().mockImplementation(() => ({
      verify: mockVerify,
      sendMail: mockSendMail,
    })),
  },
}));

function queueItem(email: string) {
  return {
    _id: `queue-${email}`,
    recipientEmail: email,
    attemptCount: 0,
    personalizationData: {},
  };
}

describe("EmailQueueManager.processQueue — bounce detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbConnect.mockResolvedValue(undefined);
    mockUserFindById.mockResolvedValue({
      emailSettings: {
        smtpServer: "smtp.example.com",
        port: 587,
        smtpUser: "seller@example.com",
        smtpPassword: "secret",
      },
    });
    mockVerify.mockResolvedValue(true);
    mockCampaignFindById.mockResolvedValue({
      _id: "campaign-1",
      userId: "seller-1",
      subject: "Hello",
      htmlContent: "<p>Hi</p>",
      fromName: "Seller",
      fromEmail: "seller@example.com",
      totalRecipients: 1,
      trackingPixel: false,
      trackLinks: false,
      unsubscribeLink: false,
      abTesting: undefined,
    });
    mockQueueFind.mockReturnValue({
      limit: () => Promise.resolve([queueItem("good@example.com")]),
    });
    mockQueueFindByIdAndUpdate.mockResolvedValue(undefined);
    mockTrackingEventCreate.mockResolvedValue(undefined);
    mockQueueCountDocuments.mockResolvedValue(0);
  });

  it("records a successful send as sent, not bounced", async () => {
    mockSendMail.mockResolvedValue({
      messageId: "msg-1",
      accepted: ["good@example.com"],
      rejected: [],
    });

    const { EmailQueueManager } = await import("@/lib/emailMarketingEngine");
    const manager = new EmailQueueManager();
    const result = await manager.processQueue("campaign-1");

    expect(result).toEqual({ sent: 1, failed: 0, bounced: 0 });
    expect(mockQueueFindByIdAndUpdate).toHaveBeenCalledWith(
      "queue-good@example.com",
      expect.objectContaining({ status: "sent", messageId: "msg-1" }),
    );
    expect(mockTrackingEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "sent" }),
    );
  });

  it("records an SMTP-accepted-but-recipient-rejected send as bounced, not sent", async () => {
    // The classic bug this fix closes: sendMail() resolves without throwing,
    // but the specific recipient is in the rejected array (bad mailbox etc).
    mockSendMail.mockResolvedValue({
      messageId: "msg-2",
      accepted: [],
      rejected: ["good@example.com"],
      response: "550 mailbox unavailable",
    });

    const { EmailQueueManager } = await import("@/lib/emailMarketingEngine");
    const manager = new EmailQueueManager();
    const result = await manager.processQueue("campaign-1");

    expect(result).toEqual({ sent: 0, failed: 0, bounced: 1 });
    expect(mockQueueFindByIdAndUpdate).toHaveBeenCalledWith(
      "queue-good@example.com",
      expect.objectContaining({
        status: "bounced",
        error: "550 mailbox unavailable",
      }),
    );
    expect(mockTrackingEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "bounced" }),
    );
  });

  it("matches the rejected address case-insensitively and against object-shaped entries", async () => {
    mockSendMail.mockResolvedValue({
      messageId: "msg-3",
      accepted: [],
      rejected: [{ address: "GOOD@EXAMPLE.COM" }],
    });

    const { EmailQueueManager } = await import("@/lib/emailMarketingEngine");
    const manager = new EmailQueueManager();
    const result = await manager.processQueue("campaign-1");

    expect(result.bounced).toBe(1);
  });

  it("does not bounce when rejected contains a different recipient than this queue item", async () => {
    mockSendMail.mockResolvedValue({
      messageId: "msg-4",
      accepted: ["good@example.com"],
      rejected: ["someone-else@example.com"],
    });

    const { EmailQueueManager } = await import("@/lib/emailMarketingEngine");
    const manager = new EmailQueueManager();
    const result = await manager.processQueue("campaign-1");

    expect(result).toEqual({ sent: 1, failed: 0, bounced: 0 });
  });

  it("counts a thrown send error as failed, distinct from a bounce", async () => {
    mockSendMail.mockRejectedValue(new Error("connection timed out"));

    const { EmailQueueManager } = await import("@/lib/emailMarketingEngine");
    const manager = new EmailQueueManager();
    const result = await manager.processQueue("campaign-1");

    expect(result).toEqual({ sent: 0, failed: 1, bounced: 0 });
    expect(mockQueueFindByIdAndUpdate).toHaveBeenCalledWith(
      "queue-good@example.com",
      expect.objectContaining({ status: "pending", attemptCount: 1 }),
    );
  });
});
