import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { verifyCSRFToken } from "./lib/csrf";

/**
 * Next.js Proxy (formerly middleware)
 *
 * Runs on every request before reaching the API routes or pages
 * - Authentication checks and role-based access control
 * - CSRF token validation for state-changing operations
 * - Subscription status verification
 * - Route protection based on user roles
 */

// ✅ Define public (unauthenticated) routes
const publicRoutes = [
  "/",
  "/auth/sign-in",
  "/auth/auth-success",
  "/auth/auth-error",
  "/contact",
  "/how-it-works",
  "/support",
  "/pricing",
  "/follow-up",
  "/form",
  "/register-buyer",
  "/plan",
  "/demo",
  "/private-policy",
  "/terms-of-service",
  "/legal",
  "/responsible-disclosure",
  "/trust",
  "/cookie-preferences",
  "/your-privacy-choices",
  /^\/privacy-information$/, // Exact match for /privacy-information
  "/privacy-information",
  /^\/form\/.*$/,
];

// ✅ Define role-based protected routes
const adminRoutes = ["/admindashboard", /^\/admindashboard\/.*$/];
const buyerRoutes = [
  "/dashboard/buyer",
  /^\/dashboard\/buyer\/.*$/,
  "/buyer-onboarding",
  /^\/buyer\/onboarding\/.*$/,
];
const sellerRoutes = [
  "/dashboard/seller",
  /^\/dashboard\/seller\/.*$/,
  "/seller-onboarding",
  /^\/seller-onboarding\/.*$/,
  "/checkout",
  /^\/checkout\/.*$/,
];

const roleBasedRoutes = {
  admin: adminRoutes,
  buyer: buyerRoutes,
  seller: sellerRoutes,
  "business-admin": sellerRoutes,
  staff: buyerRoutes,
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip proxy for static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Apply CSRF protection to API routes first
  if (pathname.startsWith("/api")) {
    return csrfProtection(request);
  }

  // Public embedded-form page: set the iframe embed restriction per-form
  // (see formEmbedCsp) rather than reaching the shared auth/role logic
  // below, since this route is always public and never role-gated.
  if (/^\/forms\/[^/]+\/?$/.test(pathname) && request.method === "GET") {
    return formEmbedCsp(request);
  }

  // Authentication and authorization for pages
  const token = await getToken({ req: request });

  // console.log("Proxy running on:", pathname);
  // console.log("Token:", token ? "Authenticated" : "Unauthenticated");

  // ✅ Skip public routes
  const isPublicRoute = publicRoutes.some((route) => {
    if (typeof route === "string") {
      return route === "/" ? pathname === "/" : pathname.startsWith(route);
    }
    return route.test(pathname);
  });

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // ❌ Block unauthenticated users
  if (!token) {
    const signInUrl = new URL("/auth/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    // console.log("Redirecting to sign-in...");
    return NextResponse.redirect(signInUrl);
  }

  // 🔒 Subscription check for seller roles (relaxed to avoid stale token loops)
  // Note: NextAuth middleware reads the JWT without running callbacks, so token
  // can be stale immediately after DB updates. Let dashboard pages enforce
  // subscription via server-side checks to avoid redirect loops.
  // Removed subscription enforcement in middleware to avoid loops due to stale JWTs
  // Dashboard and API routes perform fresh subscription checks and handle redirects.

  // ✅ Role-based route restriction
  const allowedRoutes =
    roleBasedRoutes[token.role as keyof typeof roleBasedRoutes] || [];

  const hasAccess = allowedRoutes.some((route) => {
    return typeof route === "string"
      ? pathname.startsWith(route)
      : route.test(pathname);
  });

  // Special case: users with role "user" should only access completeregistration
  // Don't redirect if they're already on completeregistration to avoid loops
  if (token.role === "user") {
    if (
      pathname === "/completeregistration" ||
      pathname.startsWith("/completeregistration")
    ) {
      return NextResponse.next();
    }
    // Redirect "user" role to complete registration
    // console.log("User role detected, redirecting to complete registration");
    // return NextResponse.redirect(new URL("/completeregistration", request.url));
  }

  if (!hasAccess) {
    // console.log(`Role ${token.role} does not have access to ${pathname}`);
    const fallbackPath =
      token.role === "admin"
        ? "/admindashboard/overview"
        : token.role === "buyer" || token.role === "staff"
          ? "/dashboard/buyer/overview"
          : token.role === "seller" || token.role === "business-admin"
            ? "/plan"
            : "/completeregistration";

    return NextResponse.redirect(new URL(fallbackPath, request.url));
  }

  // ✅ All checks passed
  return NextResponse.next();
}

/**
 * Per-form iframe embed restriction
 *
 * The global X-Frame-Options: DENY (next.config.ts) blocks framing
 * everywhere by default. This route is the one exception — it's designed
 * to be embedded in a seller's third-party site — but WHICH sites may
 * embed a given form is the seller's own choice (the "Allowed Domains"
 * field in the builder), not something next.config's static headers() can
 * express (it can't vary per :formId). CSP's frame-ancestors directive
 * supersedes X-Frame-Options when both are present, so setting it here is
 * what actually re-opens framing for this route, scoped to whatever the
 * form owner configured.
 *
 * This can't do a direct DB read (middleware/proxy needs the Node.js
 * runtime for that, which would apply to every request through this file,
 * not just this route) — so it makes one same-origin fetch to the
 * existing public GET /api/form endpoint instead, which already returns
 * allowedOrigins. A failed or slow lookup fails OPEN (unrestricted, same
 * as today) rather than ever blocking a legitimate embed.
 */
async function formEmbedCsp(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next();

  try {
    const formId = request.nextUrl.pathname.split("/")[2];
    if (!formId) return response;

    const lookupUrl = new URL(
      `/api/form?formId=${encodeURIComponent(formId)}`,
      request.nextUrl.origin,
    );
    const formRes = await fetch(lookupUrl);
    if (!formRes.ok) return response;

    const json = await formRes.json();
    const allowedOrigins: unknown = json?.data?.allowedOrigins;

    if (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0) {
      // No restriction configured — embed anywhere, matching the behavior
      // that existed before this field did.
      response.headers.set("Content-Security-Policy", "frame-ancestors *");
      return response;
    }

    const ancestors = allowedOrigins
      .filter((entry): entry is string => typeof entry === "string")
      .map(toFrameAncestorSource)
      .filter((entry): entry is string => !!entry);

    response.headers.set(
      "Content-Security-Policy",
      `frame-ancestors ${ancestors.length > 0 ? ancestors.join(" ") : "'none'"}`,
    );
  } catch (error) {
    console.error("[Proxy] formEmbedCsp lookup failed, failing open:", error);
    response.headers.set("Content-Security-Policy", "frame-ancestors *");
  }

  return response;
}

// CSP frame-ancestors needs a scheme://host[:port] source, not a bare
// hostname — sellers type plain domains ("example.com") in the builder.
function toFrameAncestorSource(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return `${url.protocol}//${url.host}`;
    } catch {
      return null;
    }
  }
  return `https://${trimmed}`;
}

/**
 * CSRF Protection Logic
 * Protects only sensitive API routes from Cross-Site Request Forgery attacks
 *
 * CSRF protection is applied to:
 * - Payment operations (stripe, refunds, payouts)
 * - Account/profile changes
 * - Role changes
 * - API key management
 * - Admin operations
 * - Settings changes
 * - Subscription changes
 *
 * CSRF protection is NOT applied to:
 * - GET/HEAD/OPTIONS requests (safe methods)
 * - Auth routes (NextAuth has its own CSRF)
 * - Webhooks (use signature verification)
 * - Health checks
 * - Public form submissions (use rate limiting)
 * - Lead submissions
 * - Chatbot
 * - Support tickets
 */
async function csrfProtection(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Safe HTTP methods don't need CSRF protection
  const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];
  if (SAFE_METHODS.includes(method)) {
    return NextResponse.next();
  }

  // Routes that REQUIRE CSRF protection (sensitive operations)
  const CSRF_REQUIRED_ROUTES = [
    "/api/payments", // All payment operations
    "/api/subscriptions", // Subscription operations
    "/api/admin", // Admin operations
    "/api/security", // API key management
    "/api/settings", // Settings changes
    "/api/users", // User profile and role operations
    "/api/users/type", // Role changes
    "/api/users/profile", // Profile updates
    "/api/buyers", // Buyer create/update/delete/import (seller-managed contacts)
    "/api/sellers", // Buyer status updates, manual credit
    "/api/form", // Form create/update/delete/clone (seller-owned)
    "/api/leads", // Lead create/update/delete, CSV import, exclusive toggle
    "/api/exclusive", // Lead exclusivity toggle
    "/api/calls/feedback", // Buyer/seller call feedback and refund decisions
    "/api/marketing", // Email/SMS campaign create/update/send (SMS routes had no protection at all)
    "/api/ai", // AI campaign generation (also unprotected previously)
    "/api/invoices", // Invoice create/update/void/send
  ];

  // Public, unauthenticated endpoints carved out of a broader required-CSRF
  // prefix above — an anonymous visitor submitting an embedded form has no
  // session or CSRF cookie to send, so this can't (and shouldn't) require one.
  const CSRF_EXEMPT_ROUTES = ["/api/form/submit"];

  // Check if this route requires CSRF
  const requiresCSRF =
    !CSRF_EXEMPT_ROUTES.some((route) => pathname.startsWith(route)) &&
    CSRF_REQUIRED_ROUTES.some((route) => pathname.startsWith(route));

  // Skip CSRF for routes that don't require it
  if (!requiresCSRF) {
    return NextResponse.next();
  }

  // Get authenticated user
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  if (!token || !token.email) {
    // No user session - let auth handle this
    return NextResponse.next();
  }

  // Extract CSRF token from header
  const csrfToken =
    request.headers.get("x-csrf-token") || request.headers.get("X-CSRF-Token");

  // Double-submit cookie pattern: token must match cookie value
  const cookieToken = request.cookies.get("csrfToken")?.value;

  if (!csrfToken || !cookieToken) {
    console.warn(
      `[CSRF] Missing token: ${method} ${pathname} by ${token.email}`,
    );
    return NextResponse.json(
      {
        error: "CSRF token required",
        message: "Include X-CSRF-Token header in your request",
      },
      { status: 403 },
    );
  }

  // Simple double-submit check: header must match cookie
  if (csrfToken !== cookieToken) {
    console.warn(
      `[CSRF] Token mismatch: ${method} ${pathname} by ${token.email}`,
    );
    return NextResponse.json(
      {
        error: "Invalid CSRF token",
        message: "Token expired or invalid. Please refresh and try again.",
      },
      { status: 403 },
    );
  }

  // Verify signed CSRF token content against request identity.
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "public";
  const identifier = (token?.email as string) || clientIp;

  const isTokenValid = verifyCSRFToken(csrfToken, identifier);
  if (!isTokenValid) {
    console.warn(
      `[CSRF] Signature validation failed: ${method} ${pathname} by ${identifier}`,
    );
    return NextResponse.json(
      {
        error: "Invalid CSRF token",
        message: "Token expired or invalid. Please refresh and try again.",
      },
      { status: 403 },
    );
  }

  // Token valid - proceed with request
  return NextResponse.next();
}

// ✅ Proxy applies to all routes except static files
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
  ],
};
