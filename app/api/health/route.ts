import { NextRequest, NextResponse } from "next/server";
import { checkCacheHealth } from "@/lib/memoryCache";
import dbConnect from "@/lib/connectdb";

/**
 * GET /api/health
 * Health check endpoint for Redis and database connectivity
 */
export async function GET(req: NextRequest) {
  try {
    // Check cache health
    const cacheHealthy = await checkCacheHealth();

    // Check Database health
    let dbHealthy = false;
    try {
      await dbConnect();
      dbHealthy = true;
    } catch (error) {
      console.error("[Health Check] Database error:", error);
    }

    const status = cacheHealthy && dbHealthy ? "healthy" : "degraded";

    return NextResponse.json(
      {
        status,
        timestamp: new Date().toISOString(),
        services: {
          cache: cacheHealthy ? "online" : "offline",
          database: dbHealthy ? "online" : "offline",
        },
      },
      {
        status: status === "healthy" ? 200 : 503,
      },
    );
  } catch (error) {
    console.error("[Health Check] Error:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Health check failed",
      },
      { status: 500 },
    );
  }
}
