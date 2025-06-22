import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({ req: request });

  console.log("Middleware running on:", pathname);
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

  // 🔒 Subscription check for seller roles
  if (
    (token.role === "seller" || token.role === "business-admin") &&
    !token.isSubActive &&
    !pathname.startsWith("/plan")
  ) {
    console.log("Redirecting to subscription plan...");
    return NextResponse.redirect(new URL("/plan", request.url));
  }

  // ✅ Role-based route restriction
  const allowedRoutes =
    roleBasedRoutes[token.role as keyof typeof roleBasedRoutes] || [];

  const hasAccess = allowedRoutes.some((route) => {
    return typeof route === "string"
      ? pathname.startsWith(route)
      : route.test(pathname);
  });

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

// ✅ Middleware applies to all except static, API, and Next image routes
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
