import {
  createHmac,
  randomBytes,
  timingSafeEqual as cryptoTimingSafeEqual,
} from "crypto";

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

const TOKEN_LENGTH = 16; // 16 random bytes for nonce
const TOKEN_EXPIRY = 3600000; // 1 hour in milliseconds

function getSigningSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "CSRF signing secret not configured: AUTH_SECRET or NEXTAUTH_SECRET must be set",
    );
  }
  return secret;
}

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
  const timestamp = Date.now().toString();
  const nonce = randomBytes(TOKEN_LENGTH).toString("hex");
  const payload = `${userId}:${timestamp}:${nonce}`;
  const signature = createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("hex");

  const tokenBody = `${timestamp}:${nonce}:${signature}`;
  const token = Buffer.from(tokenBody, "utf8").toString("base64url");

  return { token, secret: nonce };
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
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [timestampRaw, nonce, signature] = decoded.split(":");

    if (!timestampRaw || !nonce || !signature) {
      return false;
    }

    const timestamp = Number(timestampRaw);
    if (!Number.isFinite(timestamp)) {
      return false;
    }

    if (Date.now() - timestamp > TOKEN_EXPIRY) {
      return false;
    }

    const payload = `${userId}:${timestampRaw}:${nonce}`;
    const expectedSignature = createHmac("sha256", getSigningSecret())
      .update(payload)
      .digest("hex");

    return timingSafeEqual(signature, expectedSignature);
  } catch {
    return false;
  }
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
export async function invalidateCSRFToken(userId: string): Promise<void> {
  try {
    const { getRedisClient } = await import("@/lib/redis");
    const client = await getRedisClient();
    if (!client) {
      return;
    }
    await client.del(`csrf_token:${userId}`);
  } catch (error) {
    console.error("[CSRF] Error invalidating token:", error);
  }
}

/**
 * Refresh CSRF token (generate new token, keep same user)
 *
 * @param userId - User ID
 * @returns New token object
 *
 * @example
 * const { token } = await refreshCSRFToken(session.user.id);
 */
export async function refreshCSRFToken(userId: string): Promise<{
  token: string;
  secret: string;
}> {
  await invalidateCSRFToken(userId);
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
  // No-op for stateless tokens.
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks by comparing all characters
 */
function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");

  if (bufA.length !== bufB.length) {
    return false;
  }

  return cryptoTimingSafeEqual(bufA, bufB);
}
