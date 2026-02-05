import crypto from "crypto";

const algorithm = "aes-256-cbc";
const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");

/**
 * Encrypts data with a randomly generated IV per encryption
 * Returns: <IV>:<encrypted_data> (both in hex format)
 */
export function encryptData(data: string): string {
  // Generate a random IV for each encryption
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Prepend IV to encrypted data (separated by colon)
  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts data encrypted with encryptData
 * Expects format: <IV>:<encrypted_data>
 * Also handles legacy format (without IV) for backward compatibility
 */
export function decryptData(encryptedData: string): string {
  // Check if data is in new format (with IV)
  if (encryptedData.includes(":")) {
    // Split IV and encrypted data
    const parts = encryptedData.split(":");

    if (parts.length !== 2) {
      throw new Error("Invalid encrypted data format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } else {
    // Legacy format: use environment IV (for backward compatibility)
    // This should be migrated to new format
    const legacyIv = Buffer.from(
      process.env.ENCRYPTION_IV || "0".repeat(32),
      "hex",
    );
    const decipher = crypto.createDecipheriv(algorithm, key, legacyIv);
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }
}

/**
 * Re-encrypts data that was encrypted with the legacy IV
 * Decrypts using legacy method and re-encrypts with new random IV
 */
export function migrateEncryptedData(legacyEncryptedData: string): string {
  try {
    // Decrypt using legacy method
    const decrypted = decryptData(legacyEncryptedData);

    // Re-encrypt with new random IV
    return encryptData(decrypted);
  } catch (error) {
    throw new Error(`Failed to migrate encrypted data: ${error}`);
  }
}
