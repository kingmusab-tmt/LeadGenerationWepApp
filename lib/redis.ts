import redis, { RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;
let redisConnectPromise: Promise<RedisClientType | null> | null = null;
let lastConnectFailureAt = 0;

const DEFAULT_SESSION_TTL_SECONDS = 86400;
const DEFAULT_USER_CACHE_TTL_SECONDS = 3600;
const MAX_CONNECT_RETRIES = 3;
const RECONNECT_DELAY_MS = 500;
const CONNECT_RETRY_COOLDOWN_MS = 60_000;

function getRedisUrl(): string {
  return process.env.REDIS_URL || "redis://localhost:6379";
}

/**
 * Get or create Redis client connection
 */
export async function getRedisClient(): Promise<RedisClientType | null> {
  if (redisClient?.isOpen) {
    return redisClient;
  }

  if (redisConnectPromise) {
    return redisConnectPromise;
  }

  // After a failed connect, don't re-attempt on every request
  if (Date.now() - lastConnectFailureAt < CONNECT_RETRY_COOLDOWN_MS) {
    return null;
  }

  redisConnectPromise = (async () => {
    try {
      if (!redisClient) {
        redisClient = redis.createClient({
          url: getRedisUrl(),
          socket: {
            reconnectStrategy: (retries) =>
              retries >= MAX_CONNECT_RETRIES ? false : RECONNECT_DELAY_MS,
          },
        });

        redisClient.on("error", (err) => {
          // Connection-refused errors are logged once by the catch below;
          // the reconnect loop would otherwise repeat them for every attempt
          const code = (err as NodeJS.ErrnoException)?.code;
          if (code !== "ECONNREFUSED") {
            console.error("[Redis Error]", err);
          }
        });

        redisClient.on("connect", () => {
          console.log("[Redis] Connected successfully");
        });
      }

      if (!redisClient.isOpen) {
        await redisClient.connect();
      }

      lastConnectFailureAt = 0;
      return redisClient;
    } catch (error) {
      console.warn(
        "[Redis] Connection failed - running without Redis cache:",
        error instanceof Error ? error.message : error,
      );
      lastConnectFailureAt = Date.now();
      try {
        redisClient?.destroy();
      } catch {
        /* client already closed itself after exhausting reconnect attempts */
      }
      redisClient = null;
      return null;
    } finally {
      redisConnectPromise = null;
    }
  })();

  return redisConnectPromise;
}

/**
 * Close Redis connection
 */
export async function closeRedisConnection() {
  if (redisClient?.isOpen) {
    await redisClient.quit();
  }
  redisClient = null;
  redisConnectPromise = null;
}

/**
 * Get session from cache
 * Returns null if not found or expired
 */
export async function getSessionCache(
  sessionToken: string,
): Promise<unknown | null> {
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
  sessionData: unknown,
  ttlSeconds: number = DEFAULT_SESSION_TTL_SECONDS,
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

    const userSessionSetKey = `user-sessions:${userId}`;
    const sessionTokens = await client.sMembers(userSessionSetKey);

    if (sessionTokens.length > 0) {
      const sessionKeys = sessionTokens.map((token) => `session:${token}`);
      await client.del(sessionKeys);
    }

    await client.del(userSessionSetKey);
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
    await client.expire(`user-sessions:${userId}`, DEFAULT_SESSION_TTL_SECONDS);
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
  userData: unknown,
  ttlSeconds: number = DEFAULT_USER_CACHE_TTL_SECONDS,
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
export async function getUserCache(userId: string): Promise<unknown | null> {
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
