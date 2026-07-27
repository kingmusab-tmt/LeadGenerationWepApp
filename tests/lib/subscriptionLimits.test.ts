import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUserFindById = vi.fn();
const mockUserFindByIdAndUpdate = vi.fn();
const mockSendNotification = vi.fn();

vi.mock("@/lib/connectdb", () => ({ default: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/models", () => ({
  User: {
    findById: mockUserFindById,
    findByIdAndUpdate: mockUserFindByIdAndUpdate,
  },
}));
vi.mock("@/lib/notificationService", () => ({
  sendNotification: mockSendNotification,
}));

function makeUser(limits: Record<string, unknown>, usage: Record<string, unknown>) {
  return {
    subscription: {
      subscriptionLimits: limits,
      subscriptionUsage: usage,
    },
  };
}

describe("checkAndIncrementUsage — hard limit enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindByIdAndUpdate.mockResolvedValue({});
    mockSendNotification.mockResolvedValue(undefined);
  });

  it("rejects an unknown usage key without touching the database", async () => {
    const { checkAndIncrementUsage } = await import(
      "@/lib/subscriptionLimitsService"
    );
    mockUserFindById.mockResolvedValue(makeUser({}, {}));

    const result = await checkAndIncrementUsage("user-1", "not-a-real-key");

    expect(result.success).toBe(false);
    expect(result.allowed).toBe(false);
    expect(mockUserFindByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("treats limit 0 as unlimited and still tracks usage", async () => {
    const { checkAndIncrementUsage } = await import(
      "@/lib/subscriptionLimitsService"
    );
    mockUserFindById.mockResolvedValue(makeUser({ buyers: 0 }, { buyers: 500 }));

    const result = await checkAndIncrementUsage("user-1", "buyers", 3);

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(0);
    expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
      "user-1",
      { $inc: { "subscription.subscriptionUsage.buyers": 3 } },
    );
  });

  it("blocks a hard-limit request that would push usage past the cap, without incrementing", async () => {
    // A bulk import of 5 more buyers when only 2 slots remain under a
    // 10-buyer cap (8 already used) — must be blocked outright, not
    // partially applied. Checking only currentUsage < limit here would
    // have let this through.
    const { checkAndIncrementUsage } = await import(
      "@/lib/subscriptionLimitsService"
    );
    mockUserFindById.mockResolvedValue(makeUser({ buyers: 10 }, { buyers: 8 }));

    const result = await checkAndIncrementUsage("user-1", "buyers", 5);

    expect(result.success).toBe(false);
    expect(result.allowed).toBe(false);
    expect(result.currentUsage).toBe(8);
    expect(mockUserFindByIdAndUpdate).not.toHaveBeenCalled();
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "alert" }),
    );
  });

  it("allows a hard-limit request that lands exactly at the cap", async () => {
    const { checkAndIncrementUsage } = await import(
      "@/lib/subscriptionLimitsService"
    );
    mockUserFindById.mockResolvedValue(makeUser({ buyers: 10 }, { buyers: 8 }));

    const result = await checkAndIncrementUsage("user-1", "buyers", 2);

    expect(result.success).toBe(true);
    expect(result.allowed).toBe(true);
    expect(result.currentUsage).toBe(10);
    expect(mockUserFindByIdAndUpdate).toHaveBeenCalled();
  });

  it("allows a soft-limit request to exceed its cap, but sends an exceeded notification", async () => {
    // "leads" is a soft limit — sellers can still receive leads past the
    // cap, but should be notified so they know to upgrade. Usage sitting
    // exactly at the limit already (not under it) isolates the
    // limit-just-crossed-over case from the "already crossed 100%
    // earlier" case, which fires a different (limit_reached) notice.
    const { checkAndIncrementUsage } = await import(
      "@/lib/subscriptionLimitsService"
    );
    mockUserFindById.mockResolvedValue(makeUser({ leads: 50 }, { leads: 50 }));

    const result = await checkAndIncrementUsage("user-1", "leads", 2);

    expect(result.success).toBe(true);
    expect(result.allowed).toBe(true);
    expect(result.currentUsage).toBe(52);
    expect(mockUserFindByIdAndUpdate).toHaveBeenCalled();
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ level: "limit_exceeded" }),
      }),
    );
  });

  it("enforceSoftLimit option turns a normally-soft limit into a hard block", async () => {
    const { checkAndIncrementUsage } = await import(
      "@/lib/subscriptionLimitsService"
    );
    mockUserFindById.mockResolvedValue(makeUser({ leads: 50 }, { leads: 50 }));

    const result = await checkAndIncrementUsage("user-1", "leads", 1, {
      enforceSoftLimit: true,
    });

    expect(result.success).toBe(false);
    expect(result.allowed).toBe(false);
    expect(mockUserFindByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("sends exactly one notification when crossing the 80% threshold, not on every call above it", async () => {
    const { checkAndIncrementUsage } = await import(
      "@/lib/subscriptionLimitsService"
    );

    // 79 -> 80 crosses the threshold.
    mockUserFindById.mockResolvedValue(makeUser({ buyers: 100 }, { buyers: 79 }));
    const crossing = await checkAndIncrementUsage("user-1", "buyers", 1);
    expect(crossing.notificationSent).toBe(true);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();
    mockUserFindByIdAndUpdate.mockResolvedValue({});

    // 81 -> 82 stays within the same already-crossed band.
    mockUserFindById.mockResolvedValue(makeUser({ buyers: 100 }, { buyers: 81 }));
    const staying = await checkAndIncrementUsage("user-1", "buyers", 1);
    expect(staying.notificationSent).toBe(false);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("does not send a notification when sendNotifications is explicitly disabled", async () => {
    const { checkAndIncrementUsage } = await import(
      "@/lib/subscriptionLimitsService"
    );
    mockUserFindById.mockResolvedValue(makeUser({ buyers: 10 }, { buyers: 9 }));

    const result = await checkAndIncrementUsage("user-1", "buyers", 1, {
      sendNotifications: false,
    });

    expect(result.success).toBe(true);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});
