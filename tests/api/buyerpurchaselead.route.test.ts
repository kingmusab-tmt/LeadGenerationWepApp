import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetServerSession = vi.fn();
const mockDbConnect = vi.fn();

const mockBuyerFindOne = vi.fn();
const mockBuyerFindOneAndUpdate = vi.fn();

const mockLeadFindByIdSelect = vi.fn();
const mockLeadFindById = vi.fn(() => ({ select: mockLeadFindByIdSelect }));
const mockLeadFindOneAndUpdate = vi.fn();
const mockLeadExists = vi.fn();

const mockUserFindByIdSession = vi.fn();
const mockUserFindById = vi.fn(() => ({ session: mockUserFindByIdSession }));

const mockTransactionCreate = vi.fn();

const mockStartTransaction = vi.fn();
const mockCommitTransaction = vi.fn();
const mockAbortTransaction = vi.fn();
const mockEndSession = vi.fn();
const mockStartSession = vi.fn().mockResolvedValue({
  startTransaction: mockStartTransaction,
  commitTransaction: mockCommitTransaction,
  abortTransaction: mockAbortTransaction,
  endSession: mockEndSession,
});

vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/connectdb", () => ({ default: mockDbConnect }));
vi.mock("@/models/leadbuyers", () => ({
  Buyer: {
    findOne: mockBuyerFindOne,
    findOneAndUpdate: mockBuyerFindOneAndUpdate,
  },
}));
vi.mock("@/models/leads", () => ({
  Lead: {
    findById: mockLeadFindById,
    findOneAndUpdate: mockLeadFindOneAndUpdate,
    exists: mockLeadExists,
  },
}));
vi.mock("@/models", () => ({
  User: { findById: mockUserFindById },
}));
vi.mock("@/models/transactions", () => ({
  Transaction: { create: mockTransactionCreate },
}));
vi.mock("mongoose", async () => {
  const actual = await vi.importActual<typeof import("mongoose")>("mongoose");
  return {
    ...actual,
    default: { ...actual.default, startSession: mockStartSession },
  };
});

const BUYER_ID = "507f1f77bcf86cd799439011";
const LEAD_ID = "507f1f77bcf86cd799439022";

function makeRequest(): NextRequest {
  return new NextRequest("https://example.com/api/buyers/buyerpurchaselead", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ leadId: LEAD_ID }),
  });
}

describe("POST /api/buyers/buyerpurchaselead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbConnect.mockResolvedValue(undefined);
    mockGetServerSession.mockResolvedValue({
      user: { role: "buyer", email: "buyer@example.com" },
    });
    mockBuyerFindOne.mockResolvedValue({
      _id: BUYER_ID,
      email: "buyer@example.com",
      name: "Bo Buyer",
      registeredWith: "seller-1",
    });
    mockLeadFindByIdSelect.mockResolvedValue({
      unit: 5,
      status: "available",
      soldCount: 1,
      shareNumber: 3,
    });
    mockStartSession.mockResolvedValue({
      startTransaction: mockStartTransaction,
      commitTransaction: mockCommitTransaction,
      abortTransaction: mockAbortTransaction,
      endSession: mockEndSession,
    });
    mockUserFindByIdSession.mockResolvedValue({
      name: "Sam Seller",
      email: "seller@example.com",
    });
    mockTransactionCreate.mockResolvedValue([{}]);
  });

  it("rejects a repeat purchase of a shared lead by the same buyer", async () => {
    mockLeadFindOneAndUpdate.mockResolvedValue(null); // soldTo.buyerId exclusion filtered it out
    mockLeadExists.mockResolvedValue(true); // this buyer is already in soldTo

    const { POST } = await import("@/app/api/buyers/buyerpurchaselead/route");
    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("You have already purchased this lead");
    expect(mockAbortTransaction).toHaveBeenCalled();
    expect(mockBuyerFindOneAndUpdate).not.toHaveBeenCalled();

    // The atomic claim query must actually exclude this buyer's own prior
    // purchase — this is the guard the fix added.
    const claimQuery = mockLeadFindOneAndUpdate.mock.calls[0][0];
    expect(claimQuery["soldTo.buyerId"]).toEqual({ $ne: BUYER_ID });
  });

  it("reports plain unavailability when the lead is sold out to other buyers, not this one", async () => {
    mockLeadFindOneAndUpdate.mockResolvedValue(null);
    mockLeadExists.mockResolvedValue(false); // not this buyer's doing

    const { POST } = await import("@/app/api/buyers/buyerpurchaselead/route");
    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Lead is no longer available");
  });

  it("aborts and reports insufficient balance without ever flipping lead ownership state permanently", async () => {
    mockLeadFindOneAndUpdate.mockResolvedValue({
      _id: LEAD_ID,
      soldCount: 2,
      shareNumber: 3,
      save: vi.fn(),
    });
    mockBuyerFindOneAndUpdate.mockResolvedValue(null); // wallet guard rejected it

    const { POST } = await import("@/app/api/buyers/buyerpurchaselead/route");
    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Insufficient wallet balance");
    expect(mockAbortTransaction).toHaveBeenCalled();
    expect(mockTransactionCreate).not.toHaveBeenCalled();
  });

  it("completes a purchase, marks the lead sold out when the last share is claimed, and commits", async () => {
    const saveSpy = vi.fn().mockResolvedValue(undefined);
    mockLeadFindOneAndUpdate.mockResolvedValue({
      _id: LEAD_ID,
      soldCount: 3,
      shareNumber: 3, // this was the last available share
      name: "Jane Prospect",
      email: "jane@example.com",
      phone: "555-0100",
      company: "Acme",
      industry: "roofing",
      location: {},
      fields: [],
      status: "available",
      save: saveSpy,
    });
    mockBuyerFindOneAndUpdate.mockResolvedValue({ walletUnit: 95 });

    const { POST } = await import("@/app/api/buyers/buyerpurchaselead/route");
    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(saveSpy).toHaveBeenCalled(); // status flipped to "sold" and persisted
    expect(mockTransactionCreate).toHaveBeenCalled();
    expect(mockCommitTransaction).toHaveBeenCalled();
    expect(mockAbortTransaction).not.toHaveBeenCalled();
  });

  it("rejects a lead that's already fully sold out before ever starting a transaction", async () => {
    mockLeadFindByIdSelect.mockResolvedValue({
      unit: 5,
      status: "available",
      soldCount: 3,
      shareNumber: 3,
    });

    const { POST } = await import("@/app/api/buyers/buyerpurchaselead/route");
    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Lead is no longer available");
    expect(mockStartSession).not.toHaveBeenCalled();
  });
});
