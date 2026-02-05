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

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Set cache entry with TTL
   */
  set<T>(key: string, value: T, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
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
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
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
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
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
): Promise<any | null> {
  return memoryCache.get(`session:${sessionToken}`);
}

export async function setSessionCache(
  sessionToken: string,
  sessionData: any,
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
    const sessionData = memoryCache.get<any>(key);
    if (sessionData?.user?.id === userId || sessionData?.id === userId) {
      memoryCache.delete(key);
    }
  }
}

export async function invalidateUserCache(userId: string): Promise<void> {
  memoryCache.delete(`user:${userId}`);
}

export async function setUserCache(
  userId: string,
  userData: any,
  ttlSeconds: number = 3600,
): Promise<void> {
  memoryCache.set(`user:${userId}`, userData, ttlSeconds);
}

export async function getUserCache(userId: string): Promise<any | null> {
  return memoryCache.get(`user:${userId}`);
}

export async function checkCacheHealth(): Promise<boolean> {
  try {
    memoryCache.set("health-check", true, 10);
    const result = memoryCache.get("health-check");
    memoryCache.delete("health-check");
    return result === true;
  } catch (error) {
    return false;
  }
}
