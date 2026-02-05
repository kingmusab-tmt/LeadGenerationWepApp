import redis, { RedisClientType } from "redis";

let redisClient: RedisClientType;

/**
 * Get or create Redis client connection
 */
export async function getRedisClient(): Promise<RedisClientType | null> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  try {
    // Create new Redis client
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    // Handle errors
    redisClient.on("error", (err) => {
      console.error("[Redis Error]", err);
    });

    redisClient.on("connect", () => {
      console.log("[Redis] Connected successfully");
    });

    // Connect to Redis
    await redisClient.connect();

    return redisClient;
  } catch (error) {
    console.warn(
      "[Redis] Connection failed - running without Redis cache:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Close Redis connection
 */
export async function closeRedisConnection() {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
  }
}

/**
 * Get session from cache
 * Returns null if not found or expired
 */
export async function getSessionCache(
  sessionToken: string,
): Promise<any | null> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return null; // Redis not available
    }

    const cached = await client.get(`session:${sessionToken}`);

    if (!cached) {
      return null;
    }

    return JSON.parse(cached);
  } catch (error) {
    console.error("[Redis] Error getting session cache:", error);
    return null;
  }
}

/**
 * Set session in cache with TTL
 * Default TTL: 24 hours (86400 seconds)
 */
export async function setSessionCache(
  sessionToken: string,
  sessionData: any,
  ttlSeconds: number = 86400,
): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return; // Redis not available, skip caching
    }

    await client.setEx(
      `session:${sessionToken}`,
      ttlSeconds,
      JSON.stringify(sessionData),
    );
  } catch (error) {
    console.error("[Redis] Error setting session cache:", error);
    // Don't throw - allow request to continue without cache
  }
}

/**
 * Delete session from cache
 */
export async function deleteSessionCache(sessionToken: string): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return; // Redis not available
    }

    await client.del(`session:${sessionToken}`);
  } catch (error) {
    console.error("[Redis] Error deleting session cache:", error);
  }
}

/**
 * Invalidate all sessions for a user (logout all devices)
 */
export async function invalidateUserSessions(userId: string): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return; // Redis not available
    }

    const keys = await client.keys(`user-sessions:${userId}:*`);

    if (keys.length > 0) {
      for (const key of keys) {
        // Get session token from key pattern: user-sessions:userId:sessionToken
        const sessionToken = key.split(":").pop();
        if (sessionToken) {
          await client.del(`session:${sessionToken}`);
        }
      }
      // Also delete the session list
      await client.del(`user-sessions:${userId}`);
    }
  } catch (error) {
    console.error("[Redis] Error invalidating user sessions:", error);
  }
}

/**
 * Track session for a user
 */
export async function trackUserSession(
  userId: string,
  sessionToken: string,
): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return; // Redis not available
    }

    // Store session token in a set for the user
    await client.sAdd(`user-sessions:${userId}`, sessionToken);
    // Set expiry to 24 hours
    await client.expire(`user-sessions:${userId}`, 86400);
  } catch (error) {
    console.error("[Redis] Error tracking user session:", error);
  }
}

/**
 * Get user's active sessions count
 */
export async function getUserSessionsCount(userId: string): Promise<number> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return 0; // Redis not available
    }
    return await client.sCard(`user-sessions:${userId}`);
  } catch (error) {
    console.error("[Redis] Error getting user sessions count:", error);
    return 0;
  }
}

/**
 * Cache user data for quick access
 */
export async function setUserCache(
  userId: string,
  userData: any,
  ttlSeconds: number = 3600, // 1 hour default
): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return; // Redis not available
    }
    await client.setEx(`user:${userId}`, ttlSeconds, JSON.stringify(userData));
  } catch (error) {
    console.error("[Redis] Error caching user data:", error);
  }
}

/**
 * Get cached user data
 */
export async function getUserCache(userId: string): Promise<any> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return null; // Redis not available
    }
    const cached = await client.get(`user:${userId}`);

    if (!cached) {
      return null;
    }

    return JSON.parse(cached);
  } catch (error) {
    console.error("[Redis] Error getting user cache:", error);
    return null;
  }
}

/**
 * Invalidate user cache (call after user update)
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return; // Redis not available
    }
    await client.del(`user:${userId}`);
  } catch (error) {
    console.error("[Redis] Error invalidating user cache:", error);
  }
}

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return false; // Redis not available
    }
    await client.ping();
    return true;
  } catch (error) {
    console.error("[Redis] Health check failed:", error);
    return false;
  }
}
