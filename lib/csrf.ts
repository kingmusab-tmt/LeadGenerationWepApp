import { createHash, randomBytes } from "crypto";

/**
 * CSRF Token Implementation
 *
 * Protects against Cross-Site Request Forgery attacks by:
 * 1. Generating unique tokens for each session/user
 * 2. Validating tokens on state-changing operations
 * 3. Using cryptographically secure random generation
 *
 * Usage:
 * - Call generateCSRFToken() to create token
 * - Include token in forms or headers
 * - Call verifyCSRFToken() to validate
 */

const TOKEN_LENGTH = 32; // 32 bytes = 256 bits
const TOKEN_EXPIRY = 3600000; // 1 hour in milliseconds

// In-memory token storage (use Redis in production for distributed systems)
const tokenStore = new Map<string, { secret: string; timestamp: number }>();

/**
 * Generate a new CSRF token
 *
 * @param userId - Unique identifier for the user/session
 * @returns Object containing token and secret (store secret server-side)
 *
 * @example
 * const { token, secret } = generateCSRFToken(session.user.id);
 * // Store secret in session/Redis
 * // Send token to client
 */
export function generateCSRFToken(userId: string): {
  token: string;
  secret: string;
} {
  // Generate cryptographically secure random secret
  const secret = randomBytes(TOKEN_LENGTH).toString("hex");

  // Generate token by hashing secret + userId
  const token = createHash("sha256")
    .update(secret + userId)
    .digest("hex");

  // Store secret with timestamp for expiry
  tokenStore.set(userId, {
    secret,
    timestamp: Date.now(),
  });

  return { token, secret };
}

/**
 * Verify a CSRF token
 *
 * @param token - Token from client request
 * @param userId - User ID to validate against
 * @returns true if valid, false otherwise
 *
 * @example
 * const isValid = verifyCSRFToken(req.body.csrfToken, session.user.id);
 * if (!isValid) {
 *   return res.status(403).json({ error: "Invalid CSRF token" });
 * }
 */
export function verifyCSRFToken(token: string, userId: string): boolean {
  const stored = tokenStore.get(userId);

  if (!stored) {
    return false; // No token found for user
  }

  // Check token expiry
  if (Date.now() - stored.timestamp > TOKEN_EXPIRY) {
    tokenStore.delete(userId); // Clean up expired token
    return false;
  }

  // Regenerate expected token from stored secret
  const expectedToken = createHash("sha256")
    .update(stored.secret + userId)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(token, expectedToken);
}

/**
 * Invalidate CSRF token for a user
 *
 * @param userId - User ID to invalidate
 *
 * @example
 * // Call on logout
 * invalidateCSRFToken(session.user.id);
 */
export function invalidateCSRFToken(userId: string): void {
  tokenStore.delete(userId);
}

/**
 * Refresh CSRF token (generate new token, keep same user)
 *
 * @param userId - User ID
 * @returns New token object
 *
 * @example
 * const { token } = refreshCSRFToken(session.user.id);
 */
export function refreshCSRFToken(userId: string): {
  token: string;
  secret: string;
} {
  invalidateCSRFToken(userId);
  return generateCSRFToken(userId);
}

/**
 * Clean up expired tokens (call periodically)
 *
 * @example
 * // Run every 10 minutes
 * setInterval(cleanupExpiredTokens, 10 * 60 * 1000);
 */
export function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [userId, data] of tokenStore.entries()) {
    if (now - data.timestamp > TOKEN_EXPIRY) {
      tokenStore.delete(userId);
    }
  }
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks by comparing all characters
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

// Auto-cleanup expired tokens every 10 minutes
if (typeof window === "undefined") {
  // Server-side only
  setInterval(cleanupExpiredTokens, 10 * 60 * 1000);
}
