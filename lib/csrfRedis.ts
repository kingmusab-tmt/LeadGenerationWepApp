import { getRedisClient } from "./redis";
import { createHash, randomBytes } from "crypto";

/**
 * Redis-Backed CSRF Token Implementation
 *
 * Production-ready CSRF protection using Redis for distributed systems.
 * Supports multi-server deployments with shared token storage.
 */

const TOKEN_LENGTH = 32; // 32 bytes = 256 bits
const TOKEN_EXPIRY = 3600; // 1 hour in seconds

/**
 * Generate CSRF token and store in Redis
 *
 * @param userId - Unique user identifier
 * @returns CSRF token to send to client
 */
export async function generateCSRFTokenRedis(userId: string): Promise<string> {
  // Generate cryptographically secure random secret
  const secret = randomBytes(TOKEN_LENGTH).toString("hex");

  // Generate token by hashing secret + userId
  const token = createHash("sha256")
    .update(secret + userId)
    .digest("hex");

  try {
    const redis = await getRedisClient();

    if (!redis) {
      throw new Error("Redis client not available");
    }

    // Store secret in Redis with expiry
    await redis.setEx(`csrf:${userId}`, TOKEN_EXPIRY, secret);

    return token;
  } catch (error) {
    console.error("[CSRF] Failed to generate token:", error);
    throw new Error("Failed to generate CSRF token");
  }
}

/**
 * Verify CSRF token from Redis
 *
 * @param token - Token from client
 * @param userId - User ID to validate
 * @returns true if valid, false otherwise
 */
export async function verifyCSRFTokenRedis(
  token: string,
  userId: string,
): Promise<boolean> {
  try {
    const redis = await getRedisClient();

    // Retrieve stored secret
    const secret = await redis?.get(`csrf:${userId}`);

    if (!secret) {
      return false; // No token found or expired
    }

    // Regenerate expected token
    const expectedToken = createHash("sha256")
      .update(secret + userId)
      .digest("hex");

    // Timing-safe comparison
    return timingSafeEqual(token, expectedToken);
  } catch (error) {
    console.error("[CSRF] Failed to verify token:", error);
    return false; // Fail closed on errors
  }
}

/**
 * Invalidate CSRF token in Redis
 *
 * @param userId - User ID
 */
export async function invalidateCSRFTokenRedis(userId: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    await redis?.del(`csrf:${userId}`);
  } catch (error) {
    console.error("[CSRF] Failed to invalidate token:", error);
  }
}

/**
 * Refresh CSRF token (generate new one)
 *
 * @param userId - User ID
 * @returns New CSRF token
 */
export async function refreshCSRFTokenRedis(userId: string): Promise<string> {
  await invalidateCSRFTokenRedis(userId);
  return generateCSRFTokenRedis(userId);
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
