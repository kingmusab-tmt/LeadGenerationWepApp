/**
 * In-Memory Session Cache
 * Free alternative to Redis for development/small deployments
 *
 * Limitations:
 * - Data lost on server restart
 * - Not suitable for multi-server deployments
 * - Limited by available RAM
 *
 * Advantages:
 * - Zero cost
 * - No external dependencies
 * - Very fast (in-process)
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

type SessionCacheValue = {
  id?: string;
  user?: {
    id?: string;
  };
};

function extractSessionUserId(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;

  const maybeSession = value as SessionCacheValue;
  return maybeSession.user?.id || maybeSession.id;
}

const MAX_CACHE_ENTRIES = Math.max(
  100,
  Number(process.env.MEMORY_CACHE_MAX_ENTRIES || 5000),
);

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/\*/g, ".*")}$`);
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    );

    // Prevent interval from keeping the process alive during shutdown.
    this.cleanupInterval.unref?.();
  }

  /**
   * Set cache entry with TTL
   */
  set<T>(key: string, value: T, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;

    if (!this.cache.has(key) && this.cache.size >= MAX_CACHE_ENTRIES) {
      this.evictOne();
    }

    this.cache.set(key, { data: value, expiresAt });
  }

  /**
   * Get cache entry
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Delete all entries matching pattern
   */
  deletePattern(pattern: string): void {
    const regex = wildcardToRegExp(pattern);
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Get all keys matching pattern
   */
  keys(pattern: string): string[] {
    const regex = wildcardToRegExp(pattern);
    const matchingKeys: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        matchingKeys.push(key);
      }
    }

    return matchingKeys;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(
        `[MemoryCache] Cleaned up ${keysToDelete.length} expired entries`,
      );
    }
  }

  /**
   * Evict one entry when reaching configured max size.
   * Prefer removing the soonest-expiring key.
   */
  private evictOne(): void {
    let evictionKey: string | null = null;
    let earliestExpiry = Number.POSITIVE_INFINITY;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < earliestExpiry) {
        earliestExpiry = entry.expiresAt;
        evictionKey = key;
      }
    }

    if (evictionKey) {
      this.cache.delete(evictionKey);
    }
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}

// Singleton instance
const memoryCache = new MemoryCache();

export default memoryCache;

// Session-specific helpers
export async function getSessionCache(
  sessionToken: string,
): Promise<unknown | null> {
  return memoryCache.get(`session:${sessionToken}`);
}

export async function setSessionCache(
  sessionToken: string,
  sessionData: unknown,
  ttlSeconds: number = 86400,
): Promise<void> {
  memoryCache.set(`session:${sessionToken}`, sessionData, ttlSeconds);
}

export async function deleteSessionCache(sessionToken: string): Promise<void> {
  memoryCache.delete(`session:${sessionToken}`);
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  // Delete all sessions for user
  const sessionKeys = memoryCache.keys(`session:*`);

  for (const key of sessionKeys) {
    const sessionData = memoryCache.get<unknown>(key);
    if (extractSessionUserId(sessionData) === userId) {
      memoryCache.delete(key);
    }
  }
}

export async function invalidateUserCache(userId: string): Promise<void> {
  memoryCache.delete(`user:${userId}`);
}

export async function setUserCache(
  userId: string,
  userData: unknown,
  ttlSeconds: number = 3600,
): Promise<void> {
  memoryCache.set(`user:${userId}`, userData, ttlSeconds);
}

export async function getUserCache(userId: string): Promise<unknown | null> {
  return memoryCache.get(`user:${userId}`);
}

export async function checkCacheHealth(): Promise<boolean> {
  try {
    memoryCache.set("health-check", true, 10);
    const result = memoryCache.get("health-check");
    memoryCache.delete("health-check");
    return result === true;
  } catch {
    return false;
  }
}
