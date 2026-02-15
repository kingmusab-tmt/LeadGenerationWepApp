import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

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
  "/follow-up",
  "/form",
  "/register-buyer",
  "/plan",
  "/demo",
  /^\/form\/.*$/,
];

// ✅ Define role-based protected routes
const adminRoutes = ["/admindashboard", /^\/admindashboard\/.*$/];
const buyerRoutes = ["/dashboard/buyer", /^\/dashboard\/buyer\/.*$/];
const sellerRoutes = ["/dashboard/seller", /^\/dashboard\/seller\/.*$/];

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

  // Authentication and authorization for pages
  const token = await getToken({ req: request });

  console.log("Proxy running on:", pathname);
  console.log("Token:", token ? "Authenticated" : "Unauthenticated");

  // ✅ Skip public routes
  const isPublicRoute = publicRoutes.some((route) => {
    return typeof route === "string"
      ? pathname.startsWith(route)
      : route.test(pathname);
  });

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // ❌ Block unauthenticated users
  if (!token) {
    const signInUrl = new URL("/auth/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    console.log("Redirecting to sign-in...");
    return NextResponse.redirect(signInUrl);
  }

  // 🔒 Subscription check for seller roles (relaxed to avoid stale token loops)
  // Note: NextAuth middleware reads the JWT without running callbacks, so token
  // can be stale immediately after DB updates. Let dashboard pages enforce
  // subscription via server-side checks to avoid redirect loops.
  const isDashboardRoute = pathname.startsWith("/dashboard/");
  const isAllowedSubscriptionRoute =
    pathname.startsWith("/plan") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/subscription-expired");

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
    console.log("User role detected, redirecting to complete registration");
    return NextResponse.redirect(new URL("/completeregistration", request.url));
  }

  if (!hasAccess) {
    console.log(`Role ${token.role} does not have access to ${pathname}`);
    const fallbackPath =
      token.role === "admin"
        ? "/admindashboard/overview"
        : token.role === "buyer" || token.role === "staff"
          ? "/dashboard/buyer/overview"
          : token.role === "seller" || token.role === "business-admin"
            ? "/dashboard/seller/overview"
            : "/completeregistration";

    return NextResponse.redirect(new URL(fallbackPath, request.url));
  }

  // ✅ All checks passed
  return NextResponse.next();
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
    "/api/admin", // Admin operations
    "/api/security", // API key management
    "/api/settings", // Settings changes
    "/api/users/type", // Role changes
    "/api/users/profile", // Profile updates
  ];

  // Check if this route requires CSRF
  const requiresCSRF = CSRF_REQUIRED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

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
