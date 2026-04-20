import { checkCacheHealth } from "@/lib/memoryCache";
import dbConnect from "@/lib/connectdb";
import { withErrorHandler } from "@/lib/api/async-handler";
import { successResponse } from "@/lib/api/error-handler";

/**
 * GET /api/health
 * Health check endpoint for Redis and database connectivity
 */
export const GET = withErrorHandler(async () => {
  // Check cache health
  const cacheHealthy = await checkCacheHealth();

  // Database errors should not break the endpoint, but should degrade status.
  let dbHealthy = false;
  try {
    await dbConnect();
    dbHealthy = true;
  } catch (error) {
    console.error("[Health Check] Database error:", error);
  }

  const status = cacheHealthy && dbHealthy ? "healthy" : "degraded";
  const statusCode = status === "healthy" ? 200 : 503;

  return successResponse(
    {
      status,
      services: {
        cache: cacheHealthy ? "online" : "offline",
        database: dbHealthy ? "online" : "offline",
      },
    },
    statusCode,
  );
});
