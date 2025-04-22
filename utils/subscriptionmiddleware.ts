import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Protect subscription-related routes
  if (path.startsWith("/dashboard") || path.startsWith("/api/subscriptions")) {
    const token = await getToken({ req });

    if (!token) {
      const url = new URL("/auth/signin", req.url);
      url.searchParams.set("callbackUrl", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    // Additional subscription check for protected routes
    if (path.startsWith("/dashboard/pro")) {
      const response = await fetch(
        new URL("/api/subscriptions/check", req.url),
        {
          headers: req.headers,
        }
      );

      if (!response.ok) {
        return NextResponse.redirect(new URL("/pricing", req.url));
      }
    }
  }

  return NextResponse.next();
}
