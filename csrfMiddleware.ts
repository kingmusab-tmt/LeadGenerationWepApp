import { NextRequest, NextResponse } from "next/server";
import { verifyCSRFToken } from "./lib/csrf";
import { getToken } from "next-auth/jwt";

/**
 * CSRF Protection Middleware
 *
 * Validates CSRF tokens on state-changing operations (POST, PUT, DELETE, PATCH)
 * Automatically applied via middleware.ts
 *
 * Safe methods (GET, HEAD, OPTIONS) are excluded from CSRF validation
 */

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

// Routes that should skip CSRF validation
const CSRF_EXEMPT_ROUTES = [
  "/api/auth", // NextAuth routes handle their own CSRF
  "/api/csrf-token", // Token mint/refresh endpoint
  "/api/webhooks", // Webhook endpoints (use signatures instead)
  "/api/health", // Health check endpoints
];

export async function csrfMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Skip CSRF check for safe methods
  if (SAFE_METHODS.includes(method)) {
    return NextResponse.next();
  }

  // Skip CSRF check for exempt routes
  if (CSRF_EXEMPT_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get user session
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "public";
  const identifier = (token?.email as string) || clientIp;

  // Extract CSRF token from headers + cookie for double-submit check
  const csrfToken =
    request.headers.get("x-csrf-token") || request.headers.get("X-CSRF-Token");
  const cookieToken = request.cookies.get("csrfToken")?.value;

  if (!csrfToken || !cookieToken) {
    console.warn(
      `[CSRF] Missing token for ${method} ${pathname} by ${identifier}`,
    );
    return NextResponse.json({ error: "CSRF token missing" }, { status: 403 });
  }

  if (csrfToken !== cookieToken) {
    console.warn(
      `[CSRF] Header/cookie token mismatch for ${method} ${pathname} by ${identifier}`,
    );
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  // Verify CSRF token
  const isValid = verifyCSRFToken(csrfToken, identifier);

  if (!isValid) {
    console.warn(
      `[CSRF] Invalid token for ${method} ${pathname} by ${identifier}`,
    );
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  // Token valid - continue request
  return NextResponse.next();
}
