import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Signed alternative to a raw client-supplied timestamp for the public
 * form's anti-bot timing check (see /api/form/submit). A plain `Date.now()`
 * value sent by the client can be freely fabricated to claim more elapsed
 * time than actually passed; binding it to an HMAC issued by the server
 * when the form was fetched means a forged/backdated value fails
 * verification instead of being trusted at face value.
 */
const TOKEN_MAX_AGE_MS = 30 * 60 * 1000; // matches FormPreview's own draft TTL

function getSigningSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "Form load token signing secret not configured: AUTH_SECRET or NEXTAUTH_SECRET must be set",
    );
  }
  return secret;
}

export function signFormLoadToken(issuedAt: number = Date.now()): string {
  const nonce = randomBytes(8).toString("hex");
  const payload = `${issuedAt}:${nonce}`;
  const signature = createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}:${signature}`, "utf8").toString("base64url");
}

export function verifyFormLoadToken(
  token: string,
): { valid: true; issuedAt: number } | { valid: false } {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [issuedAtRaw, nonce, signature] = decoded.split(":");
    if (!issuedAtRaw || !nonce || !signature) return { valid: false };

    const issuedAt = Number(issuedAtRaw);
    if (!Number.isFinite(issuedAt)) return { valid: false };
    if (Date.now() - issuedAt > TOKEN_MAX_AGE_MS) return { valid: false };

    const payload = `${issuedAtRaw}:${nonce}`;
    const expected = createHmac("sha256", getSigningSecret())
      .update(payload)
      .digest("hex");

    const sigBuf = Buffer.from(signature, "utf8");
    const expectedBuf = Buffer.from(expected, "utf8");
    if (sigBuf.length !== expectedBuf.length) return { valid: false };
    if (!timingSafeEqual(sigBuf, expectedBuf)) return { valid: false };

    return { valid: true, issuedAt };
  } catch {
    return { valid: false };
  }
}
