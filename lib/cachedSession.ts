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
        memoryCache.deletePattern(key);
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
