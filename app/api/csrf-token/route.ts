import { NextRequest, NextResponse } from "next/server";
import { generateCSRFToken, refreshCSRFToken } from "@/lib/csrf";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";

/**
 * API Route: GET /api/csrf-token
 *
 * Generates and returns a CSRF token for the authenticated user or public access
 *
 * @returns { csrfToken: string }
 *
 * Usage:
 * const response = await fetch('/api/csrf-token');
 * const { csrfToken } = await response.json();
 */
export async function GET(req: NextRequest) {
  try {
    const limitResponse = await checkSimpleRateLimit(req, {
      scope: "csrf-token:get",
      limit: 60,
      windowMs: 60_000,
    });
    if (limitResponse) {
      return limitResponse;
    }

    const session = await getServerSession(authOptions);
    const identifier = session?.user?.email || "public";

    // Generate CSRF token for user or public access
    const { token } = generateCSRFToken(identifier);

    const response = NextResponse.json({
      csrfToken: token,
      expiresIn: 3600, // 1 hour in seconds
    });

    // Set non-HTTP-only cookie for double-submit validation in middleware
    response.cookies.set("csrfToken", token, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 3600,
    });

    return response;
  } catch (error) {
    console.error("[CSRF API] Error generating token:", error);
    return NextResponse.json(
      { error: "Failed to generate CSRF token" },
      { status: 500 },
    );
  }
}

/**
 * API Route: POST /api/csrf-token/refresh
 *
 * Refreshes the CSRF token (invalidates old, generates new)
 */
export async function POST(req: NextRequest) {
  try {
    const limitResponse = await checkSimpleRateLimit(req, {
      scope: "csrf-token:post",
      limit: 30,
      windowMs: 60_000,
    });
    if (limitResponse) {
      return limitResponse;
    }

    const session = await getServerSession(authOptions);

    // Gate token refresh to authenticated users only
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized: token refresh requires authentication" },
        { status: 401 },
      );
    }

    const { token } = await refreshCSRFToken(session.user.email);

    const response = NextResponse.json({ csrfToken: token, expiresIn: 3600 });

    response.cookies.set("csrfToken", token, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 3600,
    });

    return response;
  } catch (error) {
    console.error("[CSRF API] Error refreshing token:", error);
    return NextResponse.json(
      { error: "Failed to refresh CSRF token" },
      { status: 500 },
    );
  }
}
