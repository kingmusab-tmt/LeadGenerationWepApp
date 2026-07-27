import { beforeEach, describe, expect, it, vi } from "vitest";

const mockTransactionFindOne = vi.fn();
const mockTransactionCreate = vi.fn();
const mockBuyerFindById = vi.fn();
const mockBuyerFindByIdAndUpdate = vi.fn();

const mockStartTransaction = vi.fn();
const mockCommitTransaction = vi.fn();
const mockAbortTransaction = vi.fn();
const mockEndSession = vi.fn();
const mockStartSession = vi.fn();

vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_DOMAIN: "example.com" },
}));
vi.mock("@/lib/cachedSession", () => ({ invalidateCallCache: vi.fn() }));
vi.mock("@/utils/notifications", () => ({
  sendEmail: vi.fn(),
  sendSMS: vi.fn(),
}));
vi.mock("@/models", () => ({ User: {} }));
vi.mock("@/models/call", () => ({ default: {} }));
vi.mock("@/models/leadbuyers", () => ({
  Buyer: {
    findById: mockBuyerFindById,
    findByIdAndUpdate: mockBuyerFindByIdAndUpdate,
  },
}));
vi.mock("@/models/transactions", () => ({
  Transaction: {
    findOne: mockTransactionFindOne,
    create: mockTransactionCreate,
  },
}));
vi.mock("mongoose", async () => {
  const actual = await vi.importActual<typeof import("mongoose")>("mongoose");
  return {
    ...actual,
    default: { ...actual.default, startSession: mockStartSession },
  };
});

const CALL_RATE = { units: 1, seconds: 60 }; // 1 unit per 60 seconds

describe("chargeBuyerForCall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStartSession.mockResolvedValue({
      startTransaction: mockStartTransaction,
      commitTransaction: mockCommitTransaction,
      abortTransaction: mockAbortTransaction,
      endSession: mockEndSession,
    });
    mockTransactionFindOne.mockResolvedValue(null);
    mockBuyerFindById.mockResolvedValue({ _id: "buyer-1" });
    mockBuyerFindByIdAndUpdate.mockResolvedValue({ walletUnit: 40 });
    mockTransactionCreate.mockResolvedValue([{}]);
  });

  it("does not charge calls at or below the minimum billable duration", async () => {
    const { chargeBuyerForCall } = await import("@/utils/callHandlers");

    const result = await chargeBuyerForCall("buyer-1", 15, "CA123", CALL_RATE);

    expect(result).toEqual({ charged: false, unitsCharged: 0 });
    expect(mockStartSession).not.toHaveBeenCalled();
    expect(mockBuyerFindByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("skips charging (without touching the wallet) when the call was already billed", async () => {
    mockTransactionFindOne.mockResolvedValue({ amount: 5 });

    const { chargeBuyerForCall } = await import("@/utils/callHandlers");
    const result = await chargeBuyerForCall("buyer-1", 90, "CA-dup", CALL_RATE);

    expect(result).toEqual({ charged: false, unitsCharged: 5 });
    expect(mockStartSession).not.toHaveBeenCalled();
    expect(mockBuyerFindByIdAndUpdate).not.toHaveBeenCalled();
    expect(mockTransactionCreate).not.toHaveBeenCalled();
  });

  it("charges the wallet and records a transaction for a genuine new call", async () => {
    const { chargeBuyerForCall } = await import("@/utils/callHandlers");

    // 90 seconds at 1 unit/60s = 1.5 units, rounded up to 2.
    const result = await chargeBuyerForCall("buyer-1", 90, "CA-new", CALL_RATE);

    expect(result).toEqual({ charged: true, unitsCharged: 2 });
    expect(mockBuyerFindByIdAndUpdate).toHaveBeenCalledWith(
      "buyer-1",
      { $inc: { walletUnit: -2 } },
      expect.objectContaining({ new: true }),
    );
    expect(mockTransactionCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ type: "call_purchase", amount: 2, metadata: { callId: "CA-new" } })],
      expect.objectContaining({ session: expect.anything() }),
    );
    expect(mockCommitTransaction).toHaveBeenCalled();
    expect(mockAbortTransaction).not.toHaveBeenCalled();
  });

  it("treats a unique-index race (concurrent retry) as already-charged instead of an error", async () => {
    const duplicateError = Object.assign(new Error("dup"), { code: 11000 });
    mockTransactionCreate.mockRejectedValue(duplicateError);

    const { chargeBuyerForCall } = await import("@/utils/callHandlers");
    const result = await chargeBuyerForCall("buyer-1", 90, "CA-race", CALL_RATE);

    expect(result).toEqual({ charged: false, unitsCharged: 2 });
    expect(mockAbortTransaction).toHaveBeenCalled();
  });

  it("propagates a genuine (non-duplicate) write failure instead of silently swallowing it", async () => {
    mockTransactionCreate.mockRejectedValue(new Error("connection reset"));

    const { chargeBuyerForCall } = await import("@/utils/callHandlers");

    await expect(
      chargeBuyerForCall("buyer-1", 90, "CA-fail", CALL_RATE),
    ).rejects.toThrow("connection reset");
    expect(mockAbortTransaction).toHaveBeenCalled();
  });
});
