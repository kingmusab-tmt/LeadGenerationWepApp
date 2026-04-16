/**
 * Session Refresh API
 * Allows frontend to force refresh session after subscription changes
 * Addresses race conditions where user returns from Stripe before webhook completes
 */

import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { forceRefreshUserSession, getCachedSession } from "@/lib/cachedSession";
import connectDB from "@/lib/connectdb";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";

/**
 * POST /api/auth/refresh-session
 * Force refresh the current user's session cache
 * Call this after returning from Stripe checkout to ensure subscription is reflected
 */
export async function POST(req: NextRequest) {
  try {
    const limitResponse = checkSimpleRateLimit(req, {
      scope: "auth-refresh-session",
      limit: 20,
      windowMs: 60_000,
    });
    if (limitResponse) {
      return limitResponse;
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    await connectDB();

    // Force refresh the session
    const result = await forceRefreshUserSession(session.user.id, {
      maxRetries: 3,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: "Failed to refresh session" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Session refreshed successfully",
      session: {
        id: result.session?.id,
        email: result.session?.email,
        role: result.session?.role,
        isSubActive: result.session?.isSubActive,
        subscriptionPlan: result.session?.subscription?.subscriptionPlan,
        subscriptionExpiryDate:
          result.session?.subscription?.subscriptionExpiryDate,
      },
    });
  } catch (error) {
    console.error("[RefreshSessionAPI] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to refresh session" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/auth/refresh-session
 * Check current session status without forcing refresh
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    await connectDB();

    // Get cached session data
    const cachedSession = await getCachedSession(session.user.email, null);

    if (!cachedSession) {
      return NextResponse.json({
        success: true,
        cached: false,
        message: "No cached session found",
      });
    }

    return NextResponse.json({
      success: true,
      cached: true,
      session: {
        id: cachedSession.id,
        email: cachedSession.email,
        role: cachedSession.role,
        isSubActive: cachedSession.isSubActive,
        subscriptionPlan: cachedSession.subscription?.subscriptionPlan,
        subscriptionExpiryDate:
          cachedSession.subscription?.subscriptionExpiryDate,
        cacheVersion: cachedSession.cacheVersion,
      },
    });
  } catch (error) {
    console.error("[RefreshSessionAPI] GET Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to get session status" },
      { status: 500 },
    );
  }
}
