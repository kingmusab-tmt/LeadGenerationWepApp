// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

const authMiddleware = withAuth({
  pages: {
    signIn: "/auth/sign-in",
  },
  callbacks: {
    async authorized({ req, token }) {
      return !!token;
    },
  },
});

export default async function middleware(
  req: NextRequest,
  event: NextFetchEvent
) {
  const response = await authMiddleware(req as any, event);

  // If user is redirected to sign-in page, add callbackUrl param with original path
  if (
    response &&
    response.status === 302 &&
    response.headers.get("location") === "/auth/sign-in"
  ) {
    const signInUrl = new URL(req.url);
    signInUrl.pathname = "/auth/sign-in";
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|auth|public).*)",
    "/dashboard/seller/:path*",
    "/dashboard/buyer/:path*",
    "/admindashboard/:path*",
  ],
};
