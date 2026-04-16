import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCheckCacheHealth = vi.fn();
const mockDbConnect = vi.fn();

vi.mock("@/lib/memoryCache", () => ({
  checkCacheHealth: mockCheckCacheHealth,
}));

vi.mock("@/lib/connectdb", () => ({
  default: mockDbConnect,
}));

vi.mock("@/lib/api/async-handler", () => ({
  withErrorHandler: (handler: any) => handler,
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("returns healthy when cache and database are both available", async () => {
    mockCheckCacheHealth.mockResolvedValue(true);
    mockDbConnect.mockResolvedValue(undefined);

    const { GET } = await import("@/app/api/health/route");
    const req = new NextRequest("https://example.com/api/health");

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("healthy");
    expect(body.data.services.cache).toBe("online");
    expect(body.data.services.database).toBe("online");
  });

  it("returns degraded when database connectivity fails", async () => {
    mockCheckCacheHealth.mockResolvedValue(true);
    mockDbConnect.mockRejectedValue(new Error("db unavailable"));

    const { GET } = await import("@/app/api/health/route");
    const req = new NextRequest("https://example.com/api/health");

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("degraded");
    expect(body.data.services.cache).toBe("online");
    expect(body.data.services.database).toBe("offline");
  });
});
