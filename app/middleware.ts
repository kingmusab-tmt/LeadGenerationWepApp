// middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth/sign-in", // your custom sign-in page
  },
});

// Apply only to specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - API routes (start with /api/)
     * - Static files (typically in /_next/)
     * - Public auth pages
     * - Public images
     * - Favicon
     */
    "/((?!api|_next/static|_next/image|favicon.ico|auth|public).*)",

    // But include these specific paths in the matcher:
    "/dashboard/seller/:path*",
    "/dashboard/buyer/:path*",
    "/admindashboard/:path*",
  ],
};
