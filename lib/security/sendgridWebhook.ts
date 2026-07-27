import { createPublicKey, createVerify } from "crypto";

/**
 * Verifies a SendGrid "Signed Event Webhook" request (ECDSA over the NIST
 * P-256 curve, SHA-256 digest). SendGrid signs `timestamp + rawBody` with
 * the account's private key; the public key (base64 DER/SPKI) is generated
 * once in the SendGrid dashboard under Mail Settings -> Event Webhook ->
 * Signed Event Webhook, and stored here as SENDGRID_WEBHOOK_PUBLIC_KEY.
 *
 * Must be run against the exact raw request body string — parsing and
 * re-serializing the JSON first would produce a different byte sequence
 * and always fail verification.
 */
export function verifySendGridSignature(params: {
  publicKeyBase64: string;
  rawBody: string;
  signature: string;
  timestamp: string;
}): boolean {
  const { publicKeyBase64, rawBody, signature, timestamp } = params;

  try {
    const publicKey = createPublicKey({
      key: Buffer.from(publicKeyBase64, "base64"),
      format: "der",
      type: "spki",
    });

    const verifier = createVerify("SHA256");
    verifier.update(timestamp + rawBody);
    verifier.end();

    return verifier.verify(publicKey, Buffer.from(signature, "base64"));
  } catch {
    // Malformed key/signature/base64 — treat exactly like an invalid
    // signature rather than letting the exception propagate as a 500.
    return false;
  }
}

/** Reject requests signed further in the past than this, even with a
 * cryptographically valid signature — bounds how long a captured request
 * could be replayed. */
export const SENDGRID_TIMESTAMP_TOLERANCE_SECONDS = 10 * 60;

export function isTimestampFresh(
  timestamp: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  return Math.abs(nowSeconds - ts) <= SENDGRID_TIMESTAMP_TOLERANCE_SECONDS;
}
