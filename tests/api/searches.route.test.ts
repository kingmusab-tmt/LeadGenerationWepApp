import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDbConnect = vi.fn();
const mockFind = vi.fn();
const mockFindOneAndUpdate = vi.fn();

vi.mock("@/lib/connectdb", () => ({
  default: mockDbConnect,
}));

vi.mock("@/models/leads", () => ({
  Lead: {
    find: mockFind,
    findOneAndUpdate: mockFindOneAndUpdate,
  },
}));

type MockSession = { user: { id: string; email: string } };
type MockAuthedHandler = (
  req: NextRequest,
  session: MockSession,
  context?: unknown,
) => Promise<Response>;

vi.mock("@/lib/api/async-handler", () => {
  return {
    withAuth: (handler: MockAuthedHandler) => {
      return async (req: NextRequest, context?: unknown) => {
        return handler(
          req,
          { user: { id: "seller-123", email: "seller@example.com" } },
          context,
        );
      };
    },
  };
});

describe("/api/searches route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbConnect.mockResolvedValue(undefined);
  });

  it("GET returns favorite leads for authenticated seller", async () => {
    mockFind.mockResolvedValue([{ _id: "lead-1", isFavorite: true }]);

    const { GET } = await import("@/app/api/searches/route");
    const req = new NextRequest("https://example.com/api/searches");

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.leads).toEqual([{ _id: "lead-1", isFavorite: true }]);
    expect(mockFind).toHaveBeenCalledWith(
      { userId: "seller-123", isFavorite: true },
      null,
      { strict: false },
    );
  });

  it("POST returns 400 when leadId is missing", async () => {
    const { POST } = await import("@/app/api/searches/route");
    const req = new NextRequest("https://example.com/api/searches", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe("leadId is required.");
    expect(body.code).toBe("BAD_REQUEST");
  });

  it("POST marks lead as favorite", async () => {
    mockFindOneAndUpdate.mockResolvedValue({ _id: "lead-2", isFavorite: true });

    const { POST } = await import("@/app/api/searches/route");
    const req = new NextRequest("https://example.com/api/searches", {
      method: "POST",
      body: JSON.stringify({ leadId: "lead-2" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.message).toBe("Lead marked as favorite.");
    expect(body.data.lead).toEqual({ _id: "lead-2", isFavorite: true });
    expect(mockFindOneAndUpdate).toHaveBeenCalled();
  });
});
