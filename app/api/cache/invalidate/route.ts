import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { invalidateUserCache } from "@/lib/memoryCache";
import {
  successResponse,
  unauthorized,
  badRequest,
  internalError,
} from "@/lib/api/error-handler";
import { ZodError } from "zod";
import { mongoIdParamSchema } from "@/lib/validation/schemas";

/**
 * POST /api/cache/invalidate
 * Invalidate user cache and sessions
 * Used after user profile updates
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    let body;
    try {
      body = await req.json();
    } catch (error) {
      return badRequest("Invalid JSON in request body");
    }

    const { userId } = body;

    // If userId provided, validate format
    if (userId) {
      try {
        mongoIdParamSchema.parse(userId);
      } catch (error) {
        if (error instanceof ZodError) {
          return badRequest("Invalid user ID format");
        }
      }
    }

    // Only allow users to invalidate their own cache or admins
    const targetUserId = userId || session.user.id;
    if (session.user.id !== targetUserId && session.user.role !== "admin") {
      return unauthorized("Can only invalidate your own cache");
    }

    // Invalidate user cache
    await invalidateUserCache(targetUserId);

    return successResponse({
      message: "Cache invalidated successfully",
      userId: targetUserId,
    });
  } catch (error) {
    console.error("[POST /api/cache/invalidate]", error);
    return internalError("Failed to invalidate cache");
  }
}
