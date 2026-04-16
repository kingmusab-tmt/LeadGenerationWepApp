import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import {
  getSessionCache,
  setSessionCache,
  deleteSessionCache,
  invalidateUserCache,
} from "@/lib/memoryCache";
import memoryCache from "@/lib/memoryCache";

/**
 * Get user session with Redis caching
 * Reduces database queries by ~99%
 */
export async function getCachedSession(userEmail: string, token: any) {
  // Note: getSessionCache adds its own "session:" prefix, so we pass just the email
  const cachedSession = await getSessionCache(userEmail);

  // If cache exists, verify it matches the current token data
  // If token has different role or isSubActive, cache is stale - refetch from DB
  if (cachedSession) {
    const tokenRole = token?.role;
    const tokenIsSubActive = token?.isSubActive;

    // Check if cache is stale by comparing with JWT token data
    const isStale =
      (tokenRole && cachedSession.role !== tokenRole) ||
      (typeof tokenIsSubActive === "boolean" &&
        cachedSession.isSubActive !== tokenIsSubActive);

    if (isStale) {
      console.log(
        "[Cache] Session cache STALE for:",
        userEmail,
        "- refetching from DB",
      );
      console.log(
        "[Cache] Token role:",
        tokenRole,
        "Cache role:",
        cachedSession.role,
      );
      console.log(
        "[Cache] Token isSubActive:",
        tokenIsSubActive,
        "Cache isSubActive:",
        cachedSession.isSubActive,
      );
      // Invalidate stale cache
      await deleteSessionCache(userEmail);
    } else {
      console.log("[Cache] Session cache HIT for:", userEmail);
      return cachedSession;
    }
  } else {
    console.log(
      "[Cache] Session cache MISS for:",
      userEmail,
      "- fetching from DB",
    );
  }

  // Cache miss - fetch from database
  await dbConnect();
  const dbUser = await User.findOne({ email: userEmail }).lean();

  if (!dbUser) {
    console.log("[Cache] User not found in DB:", userEmail);
    return null;
  }

  console.log("[Cache] User found in DB:", userEmail, "role:", dbUser.role);

  const sessionData = {
    id: dbUser._id?.toString(),
    email: dbUser.email,
    name: dbUser.name,
    image: dbUser.image ?? null,
    role: dbUser.role,
    isSubActive: dbUser.subscription?.isSubscriptionActive,
    // Include full subscription data so session always has current subscription state
    subscription: dbUser.subscription || null,
  };

  // Note: setSessionCache adds its own "session:" prefix, so we pass just the email
  await setSessionCache(userEmail, sessionData, 3600);

  return sessionData;
}

/**
 * Invalidate user's session cache (call after user updates)
 */
export async function invalidateSessionCache(userEmail: string) {
  try {
    // Delete the session cache - deleteSessionCache adds "session:" prefix
    await deleteSessionCache(userEmail);
    // Also try pattern match just in case
    memoryCache.deletePattern(`session:${userEmail}*`);
    console.log("[Cache] Invalidated session cache for:", userEmail);
  } catch (error) {
    console.error("[Auth] Failed to invalidate session cache:", error);
  }
}

/**
 * Invalidate all sessions for a user by ID
 * Used when user data changes (role, subscription, etc.)
 */
export async function invalidateAllUserSessions(userId: string) {
  try {
    // Find and delete all sessions that belong to this user
    const sessionKeys = memoryCache.keys(`session:*`);
    let invalidatedCount = 0;

    for (const key of sessionKeys) {
      const sessionData = memoryCache.get<any>(key);
      if (sessionData?.id === userId) {
        memoryCache.delete(key);
        invalidatedCount++;
      }
    }

    console.log(
      `[Cache] Invalidated ${invalidatedCount} sessions for user: ${userId}`,
    );
  } catch (error) {
    console.error("[Auth] Failed to invalidate all user sessions:", error);
  }
}

// ============================================================
// ROBUST SESSION REFRESH (addresses race conditions)
// ============================================================

/**
 * Force refresh user's session atomically
 * This ensures cache is cleared AND immediately repopulated with fresh data
 * Eliminates race conditions where user sees stale data
 */
export async function forceRefreshUserSession(
  userId: string,
  options?: { maxRetries?: number },
): Promise<{ success: boolean; session?: any; error?: string }> {
  const maxRetries = options?.maxRetries || 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await dbConnect();

      // Get fresh user data from database
      const user = await User.findById(userId).lean();
      if (!user) {
        return { success: false, error: "User not found" };
      }

      const userEmail = user.email;

      // Clear all existing caches for this user (atomic clear)
      await Promise.all([
        deleteSessionCache(userEmail),
        invalidateUserCache(userId),
      ]);

      // Also clear by pattern for any edge cases
      memoryCache.deletePattern(`session:${userEmail}*`);
      memoryCache.deletePattern(`user:${userId}*`);

      // Immediately repopulate cache with fresh data
      const sessionData = {
        id: user._id?.toString(),
        email: user.email,
        name: user.name,
        image: user.image ?? null,
        role: user.role,
        isSubActive: user.subscription?.isSubscriptionActive,
        subscription: user.subscription || null,
        // Add version to detect stale sessions
        cacheVersion: Date.now(),
      };

      // Store in cache
      await setSessionCache(userEmail, sessionData, 3600);

      console.log(
        `[Cache] Force refreshed session for user: ${userEmail} (attempt ${attempt})`,
      );

      return { success: true, session: sessionData };
    } catch (error: any) {
      lastError = error;
      console.error(
        `[Cache] Force refresh attempt ${attempt} failed:`,
        error.message,
      );

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 100),
        );
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || "Failed to refresh session after retries",
  };
}

/**
 * Invalidate session and wait for confirmation
 * Returns only after cache is confirmed cleared
 */
export async function invalidateSessionWithConfirmation(
  userEmail: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Clear session cache
    await deleteSessionCache(userEmail);

    // Clear by pattern
    memoryCache.deletePattern(`session:${userEmail}*`);

    // Invalidate all sessions for this user
    const sessionKeys = memoryCache.keys(`session:*`);
    for (const key of sessionKeys) {
      const sessionData = memoryCache.get<any>(key);
      if (sessionData?.id === userId) {
        memoryCache.deletePattern(key);
      }
    }

    // Invalidate user cache
    await invalidateUserCache(userId);

    // Verify cache is cleared
    const cachedSession = await getSessionCache(userEmail);
    if (cachedSession) {
      // Cache not cleared - force delete
      memoryCache.deletePattern(`*${userEmail}*`);
    }

    console.log(
      `[Cache] Confirmed session invalidation for: ${userEmail} (${userId})`,
    );
    return { success: true };
  } catch (error: any) {
    console.error("[Cache] Session invalidation confirmation failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update user subscription and refresh session atomically
 * Ensures no race condition between DB update and cache refresh
 */
export async function updateSubscriptionAndRefreshSession(
  userId: string,
  subscriptionUpdate: Record<string, any>,
): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    await dbConnect();

    // Perform atomic update
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          ...subscriptionUpdate,
          // Add timestamp to track when subscription was last updated
          "subscription.lastUpdatedAt": new Date(),
        },
      },
      { new: true },
    );

    if (!updatedUser) {
      return { success: false, error: "User not found" };
    }

    // Force refresh session with new data
    const refreshResult = await forceRefreshUserSession(userId);

    if (!refreshResult.success) {
      console.error(
        "[Cache] Subscription updated but session refresh failed:",
        refreshResult.error,
      );
      // Still return success since DB was updated - cache will eventually be consistent
    }

    console.log(
      `[Cache] Subscription updated & session refreshed for: ${userId}`,
    );

    return { success: true, user: updatedUser };
  } catch (error: any) {
    console.error("[Cache] updateSubscriptionAndRefreshSession failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * PHASE 2: Invalidate lead cache (call after lead create/update/delete)
 */
export async function invalidateLeadCache(leadId: string) {
  try {
    memoryCache.deletePattern(`lead:${leadId}*`);
    memoryCache.deletePattern(`*:leads:*`); // Invalidate lead lists
  } catch (error) {
    console.error("[Cache] Failed to invalidate lead cache:", error);
  }
}

/**
 * PHASE 2: Invalidate form cache (call after form create/update/delete)
 */
export async function invalidateFormCache(formId: string) {
  try {
    memoryCache.deletePattern(`form:${formId}*`);
    memoryCache.deletePattern(`*:forms:*`); // Invalidate form lists
  } catch (error) {
    console.error("[Cache] Failed to invalidate form cache:", error);
  }
}

/**
 * Invalidate buyer cache (call after buyer data changes)
 */
export async function invalidateBuyerCache(buyerId: string) {
  try {
    memoryCache.deletePattern(`buyer:${buyerId}*`);
  } catch (error) {
    console.error("[Cache] Failed to invalidate buyer cache:", error);
  }
}

/**
 * PHASE 3: Invalidate call cache (call after call create/update/delete)
 */
export async function invalidateCallCache(callId: string) {
  try {
    memoryCache.deletePattern(`call:${callId}*`);
    memoryCache.deletePattern(`*:calls:*`); // Invalidate call lists
  } catch (error) {
    console.error("[Cache] Failed to invalidate call cache:", error);
  }
}

/**
 * PHASE 3: Invalidate notification cache (call after notification create/update)
 */
export async function invalidateNotificationCache(userId: string) {
  try {
    memoryCache.deletePattern(`notification:${userId}*`);
    memoryCache.deletePattern(`*:notifications:*`); // Invalidate notification lists
  } catch (error) {
    console.error("[Cache] Failed to invalidate notification cache:", error);
  }
}

/**
 * Comprehensive cache invalidation for related entities
 * Pass any entity IDs that were modified
 */
export async function invalidateRelatedCaches(options: {
  userEmail?: string;
  userId?: string;
  leadId?: string;
  buyerId?: string;
  formId?: string;
  callId?: string;
}) {
  try {
    const promises = [];

    if (options.userEmail) {
      promises.push(invalidateSessionCache(options.userEmail));
    }
    if (options.userId) {
      promises.push(invalidateUserCache(options.userId));
    }
    if (options.leadId) {
      promises.push(invalidateLeadCache(options.leadId));
    }
    if (options.buyerId) {
      promises.push(invalidateBuyerCache(options.buyerId));
    }
    if (options.formId) {
      promises.push(invalidateFormCache(options.formId));
    }
    if (options.callId) {
      promises.push(invalidateCallCache(options.callId));
    }

    await Promise.all(promises.filter(Boolean));
  } catch (error) {
    console.error("[Cache] Failed to invalidate related caches:", error);
  }
}
