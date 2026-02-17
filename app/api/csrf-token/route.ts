import { NextRequest, NextResponse } from "next/server";
import { generateCSRFToken } from "@/lib/csrf";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

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
export async function GET(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await getServerSession(authOptions);

    // Use email if authenticated, otherwise use IP or fallback to "public"
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "public";
    const identifier = session?.user?.email || clientIp;

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
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Use email if authenticated, otherwise use IP or fallback to "public"
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "public";
    const identifier = session?.user?.email || clientIp;

    // Refresh token
    const { refreshCSRFToken } = await import("@/lib/csrf");
    const { token } = refreshCSRFToken(identifier);

    const response = NextResponse.json({
      csrfToken: token,
      expiresIn: 3600,
    });

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
