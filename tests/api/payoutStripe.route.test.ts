import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetServerSession = vi.fn();
const mockDbConnect = vi.fn();
const mockCheckSimpleRateLimit = vi.fn();

const mockUserFindOneSelect = vi.fn();
const mockUserFindOne = vi.fn(() => ({ select: mockUserFindOneSelect }));
const mockUserFindOneAndUpdate = vi.fn();
const mockUserUpdateOne = vi.fn();

const mockIdempotencyCreate = vi.fn();
const mockIdempotencyFindOne = vi.fn();
const mockIdempotencyUpdateOne = vi.fn();
const mockIdempotencyDeleteOne = vi.fn();

const mockTransactionSave = vi.fn();
const MockTransaction = vi.fn().mockImplementation(function (
  this: Record<string, unknown>,
  data: Record<string, unknown>,
) {
  Object.assign(this, data);
  this.save = mockTransactionSave;
});

const mockBalanceRetrieve = vi.fn();
const mockTransfersCreate = vi.fn();
const mockPayoutsCreate = vi.fn();

vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/connectdb", () => ({ default: mockDbConnect }));
vi.mock("@/lib/env", () => ({ env: { STRIPE_SECRET_KEY: "sk_test_fake" } }));
vi.mock("@/lib/security/simpleRateLimit", () => ({
  checkSimpleRateLimit: mockCheckSimpleRateLimit,
}));
vi.mock("@/models", () => ({
  User: {
    findOne: mockUserFindOne,
    findOneAndUpdate: mockUserFindOneAndUpdate,
    updateOne: mockUserUpdateOne,
  },
}));
vi.mock("@/models/idempotencyKey", () => ({
  IdempotencyKey: {
    create: mockIdempotencyCreate,
    findOne: mockIdempotencyFindOne,
    updateOne: mockIdempotencyUpdateOne,
    deleteOne: mockIdempotencyDeleteOne,
  },
}));
vi.mock("@/models/transactions", () => ({ Transaction: MockTransaction }));
vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.balance = { retrieve: mockBalanceRetrieve };
    this.transfers = { create: mockTransfersCreate };
    this.payouts = { create: mockPayoutsCreate };
  }),
}));

const VALID_KEY = "11111111-1111-1111-1111-111111111111";
const SELLER = {
  role: "seller",
  stripeAccountId: "acct_123",
  walletBalance: 500,
  name: "Sam Seller",
  email: "seller@example.com",
};

function makeRequest(options: {
  headers?: Record<string, string>;
  body?: unknown;
} = {}): NextRequest {
  return new NextRequest("https://example.com/api/payments/payout/stripe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": VALID_KEY,
      ...options.headers,
    },
    body: JSON.stringify(options.body ?? { amount: 100, currency: "usd" }),
  });
}

describe("POST /api/payments/payout/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbConnect.mockResolvedValue(undefined);
    mockCheckSimpleRateLimit.mockResolvedValue(null);
    mockGetServerSession.mockResolvedValue({
      user: { id: "seller-1", email: "seller@example.com" },
    });
    mockUserFindOneSelect.mockResolvedValue(SELLER);
    mockIdempotencyCreate.mockResolvedValue(undefined);
    mockDeleteOneResolves();
    mockIdempotencyUpdateOne.mockResolvedValue(undefined);
    mockBalanceRetrieve.mockResolvedValue({
      available: [{ currency: "usd", amount: 100_000 }],
    });
    mockTransactionSave.mockResolvedValue(undefined);
  });

  function mockDeleteOneResolves() {
    mockIdempotencyDeleteOne.mockReturnValue({
      catch: () => Promise.resolve(),
    });
  }

  it("rejects a request with no Idempotency-Key header", async () => {
    const { POST } = await import("@/app/api/payments/payout/stripe/route");
    const req = makeRequest({ headers: { "idempotency-key": "" } });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockIdempotencyCreate).not.toHaveBeenCalled();
  });

  it("rejects a non-UUID Idempotency-Key header", async () => {
    const { POST } = await import("@/app/api/payments/payout/stripe/route");
    const req = makeRequest({ headers: { "idempotency-key": "not-a-uuid" } });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("replays a cached successful response for a repeated idempotency key without touching Stripe", async () => {
    const duplicateError = Object.assign(new Error("dup"), { code: 11000 });
    mockIdempotencyCreate.mockRejectedValue(duplicateError);
    mockIdempotencyFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        status: "completed",
        responseBody: { message: "Payout initiated successfully.", transferId: "tr_1" },
      }),
    });

    const { POST } = await import("@/app/api/payments/payout/stripe/route");
    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.transferId).toBe("tr_1");
    expect(mockTransfersCreate).not.toHaveBeenCalled();
    expect(mockUserFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("replays a cached failure (post-transfer) with its original shape and status, not as a 200", async () => {
    const duplicateError = Object.assign(new Error("dup"), { code: 11000 });
    mockIdempotencyCreate.mockRejectedValue(duplicateError);
    mockIdempotencyFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        status: "completed",
        responseBody: {
          success: false,
          error: "Transferred funds not yet available for payout.",
        },
      }),
    });

    const { POST } = await import("@/app/api/payments/payout/stripe/route");
    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Transferred funds not yet available for payout.");
  });

  it("returns 409 while a request with the same key is still processing", async () => {
    const duplicateError = Object.assign(new Error("dup"), { code: 11000 });
    mockIdempotencyCreate.mockRejectedValue(duplicateError);
    mockIdempotencyFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ status: "processing" }),
    });

    const { POST } = await import("@/app/api/payments/payout/stripe/route");
    const res = await POST(makeRequest());

    expect(res.status).toBe(409);
    expect(mockTransfersCreate).not.toHaveBeenCalled();
  });

  it("rejects insufficient wallet balance atomically and releases the idempotency claim", async () => {
    mockUserFindOneAndUpdate.mockResolvedValue(null); // atomic guard found nothing to match

    const { POST } = await import("@/app/api/payments/payout/stripe/route");
    const res = await POST(makeRequest({ body: { amount: 999, currency: "usd" } }));

    expect(res.status).toBe(400);
    expect(mockTransfersCreate).not.toHaveBeenCalled();
    expect(mockIdempotencyDeleteOne).toHaveBeenCalledWith({
      key: VALID_KEY,
      scope: "payments:payout:stripe",
    });
  });

  it("rolls back the wallet debit and releases the claim if the Stripe transfer fails", async () => {
    mockUserFindOneAndUpdate.mockResolvedValue({ ...SELLER, walletBalance: 400 });
    mockTransfersCreate.mockRejectedValue(new Error("card_declined"));

    const { POST } = await import("@/app/api/payments/payout/stripe/route");
    const res = await POST(makeRequest());

    expect(res.status).toBe(500);
    expect(mockUserUpdateOne).toHaveBeenCalledWith(
      { _id: "seller-1" },
      { $inc: { walletBalance: 100 } },
    );
    expect(mockIdempotencyDeleteOne).toHaveBeenCalled();
    expect(mockTransactionSave).not.toHaveBeenCalled();
  });

  it("completes a full payout: debits once, transfers, pays out, marks the claim completed", async () => {
    mockUserFindOneAndUpdate.mockResolvedValue({ ...SELLER, walletBalance: 400 });
    mockTransfersCreate.mockResolvedValue({ id: "tr_success" });
    mockPayoutsCreate.mockResolvedValue({ id: "po_success" });
    // Second balance.retrieve call is for the connected account's own balance.
    mockBalanceRetrieve.mockResolvedValueOnce({
      available: [{ currency: "usd", amount: 100_000 }],
    }).mockResolvedValueOnce({
      available: [{ currency: "usd", amount: 100_000 }],
    });

    const { POST } = await import("@/app/api/payments/payout/stripe/route");
    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.transferId).toBe("tr_success");
    expect(body.data.payoutId).toBe("po_success");
    expect(mockUserFindOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(mockIdempotencyUpdateOne).toHaveBeenCalledWith(
      { key: VALID_KEY, scope: "payments:payout:stripe" },
      { $set: { status: "completed", responseBody: expect.any(Object) } },
    );
  });
});
