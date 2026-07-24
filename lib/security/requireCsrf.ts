import { NextRequest, NextResponse } from "next/server";
import { verifyCSRFToken } from "@/lib/csrf";

/**
 * Verifies the X-CSRF-Token header against the authenticated user's identity.
 * Tokens are minted by /api/csrf-token keyed on session.user.email (see
 * generateCSRFToken there), so verification must use the same identifier.
 *
 * Returns a 403 NextResponse if the token is missing/invalid, or null if the
 * request may proceed.
 */
export function requireCsrf(
  req: NextRequest,
  userEmail: string | null | undefined,
): NextResponse | null {
  if (!userEmail) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const token = req.headers.get("x-csrf-token");
  if (!token || !verifyCSRFToken(token, userEmail)) {
    return NextResponse.json(
      { success: false, error: "Invalid or missing CSRF token" },
      { status: 403 },
    );
  }

  return null;
}
