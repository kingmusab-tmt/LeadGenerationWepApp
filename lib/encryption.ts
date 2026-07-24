import crypto from "crypto";
import { env } from "@/lib/env";

const GCM_ALGORITHM = "aes-256-gcm";
const LEGACY_CBC_ALGORITHM = "aes-256-cbc";
const GCM_IV_LENGTH = 12; // NIST-recommended IV length for GCM
const key = Buffer.from(env.ENCRYPTION_KEY, "hex");

/**
 * Encrypts data with AES-256-GCM: a random IV per encryption plus an
 * authentication tag, so tampered ciphertext fails to decrypt instead of
 * silently producing garbage plaintext (which plain CBC does not protect
 * against).
 * Returns: <iv>:<encrypted_data>:<authTag> (all hex).
 */
export function encryptData(data: string): string {
  const iv = crypto.randomBytes(GCM_IV_LENGTH);
  const cipher = crypto.createCipheriv(GCM_ALGORITHM, key, iv);

  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${encrypted}:${authTag.toString("hex")}`;
}

/**
 * Decrypts data encrypted with encryptData. Handles three formats so
 * previously-stored secrets keep working after this module moved from
 * CBC to GCM:
 *  - <iv>:<data>:<authTag>  — current format (AES-256-GCM)
 *  - <iv>:<data>            — previous format (AES-256-CBC, random IV)
 *  - <data>                 — oldest format (AES-256-CBC, static/env IV)
 */
export function decryptData(encryptedData: string): string {
  const parts = encryptedData.split(":");

  if (parts.length === 3) {
    const [ivHex, encrypted, authTagHex] = parts;
    const decipher = crypto.createDecipheriv(
      GCM_ALGORITHM,
      key,
      Buffer.from(ivHex, "hex"),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  if (parts.length === 2) {
    const [ivHex, encrypted] = parts;
    const decipher = crypto.createDecipheriv(
      LEGACY_CBC_ALGORITHM,
      key,
      Buffer.from(ivHex, "hex"),
    );
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  if (parts.length === 1) {
    // Oldest format: static/env IV (for backward compatibility)
    const legacyIv = Buffer.from(
      process.env.ENCRYPTION_IV || "0".repeat(32),
      "hex",
    );
    const decipher = crypto.createDecipheriv(
      LEGACY_CBC_ALGORITHM,
      key,
      legacyIv,
    );
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  throw new Error("Invalid encrypted data format");
}

/**
 * Re-encrypts data that was encrypted with either legacy format under the
 * current AES-256-GCM scheme.
 */
export function migrateEncryptedData(legacyEncryptedData: string): string {
  try {
    const decrypted = decryptData(legacyEncryptedData);
    return encryptData(decrypted);
  } catch (error) {
    throw new Error(
      `Failed to migrate encrypted data: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
