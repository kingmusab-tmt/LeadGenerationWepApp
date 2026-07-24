import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetServerSession = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock("@/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/api/error-logger", () => ({
  logApiError: vi.fn(),
  errorLogger: {
    info: vi.fn(),
    logError: vi.fn(),
  },
}));

describe("withAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session is present", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const { withAuth } = await import("@/lib/api/async-handler");

    const handler = withAuth(async () => {
      return NextResponse.json({ ok: true });
    });

    const res = await handler(new NextRequest("https://example.com/api/test"));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("returns 403 when session role does not match required role", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-1", role: "seller" },
    });
    const { withAuth } = await import("@/lib/api/async-handler");

    const handler = withAuth(
      async () => {
        return NextResponse.json({ ok: true });
      },
      { requireRole: ["admin"] },
    );

    const res = await handler(new NextRequest("https://example.com/api/test"));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.code).toBe("FORBIDDEN");
  });

  it("passes session to handler when authenticated and authorized", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-2", role: "admin", email: "admin@example.com" },
    });
    const { withAuth } = await import("@/lib/api/async-handler");

    const wrappedHandler = vi.fn(
      async (
        _req: NextRequest,
        session: {
          user: { id: string; role?: string | null; email?: string | null };
        },
      ) => {
        return NextResponse.json({ ok: true, userId: session.user.id });
      },
    );

    const handler = withAuth(wrappedHandler, { requireRole: ["admin"] });

    const res = await handler(new NextRequest("https://example.com/api/test"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.userId).toBe("user-2");
    expect(wrappedHandler).toHaveBeenCalledTimes(1);
  });
});
