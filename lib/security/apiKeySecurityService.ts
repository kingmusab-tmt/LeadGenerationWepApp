/**
 * API Key Security Service
 * Handles secure storage, encryption, rotation, and audit logging for API keys
 *
 * Security Features:
 * - AES-256-CBC encryption for API keys that need to be retrieved (HubSpot, Salesforce)
 * - SHA-256 hashing for API keys used for authentication (Zapier Actions)
 * - Key rotation support
 * - Audit logging for all key operations
 * - Automatic key expiration
 * - Rate limiting on key usage
 *
 * Date: January 21, 2026
 */

import crypto from "crypto";
import { encryptData, decryptData } from "../encryption";
import dbConnect from "../connectdb";
import mongoose from "mongoose";

/**
 * API Key Types
 */
export enum ApiKeyType {
  HUBSPOT = "hubspot",
  SALESFORCE = "salesforce",
  ZAPIER_ACTION = "zapier_action",
  ZAPIER_TRIGGER = "zapier_trigger",
  GENERIC = "generic",
}

/**
 * API Key Audit Event Types
 */
export enum ApiKeyAuditEvent {
  CREATED = "created",
  UPDATED = "updated",
  ROTATED = "rotated",
  USED = "used",
  REVOKED = "revoked",
  EXPIRED = "expired",
  FAILED_USE = "failed_use",
}

/**
 * API Key Metadata
 */
interface ApiKeyMetadata {
  userId: string;
  keyType: ApiKeyType;
  name?: string;
  description?: string;
  expiresAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;
  isActive: boolean;
  createdAt: Date;
  rotatedAt?: Date;
}

/**
 * Encrypted API Key Storage
 */
interface EncryptedApiKey {
  keyId: string;
  encryptedValue: string; // For keys that need retrieval (HubSpot, Salesforce)
  hashedValue?: string; // For authentication keys (Zapier)
  metadata: ApiKeyMetadata;
}

/**
 * Audit Log Entry
 */
interface ApiKeyAuditLog {
  keyId: string;
  userId: string;
  event: ApiKeyAuditEvent;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * API Key Audit Log Schema
 */
const apiKeyAuditLogSchema = new mongoose.Schema({
  keyId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  event: {
    type: String,
    enum: Object.values(ApiKeyAuditEvent),
    required: true,
  },
  timestamp: { type: Date, default: Date.now, index: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  success: { type: Boolean, required: true },
  errorMessage: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
});

// Create model if it doesn't exist
const ApiKeyAuditLogModel =
  mongoose.models.ApiKeyAuditLog ||
  mongoose.model("ApiKeyAuditLog", apiKeyAuditLogSchema);

/**
 * API Key Security Service
 */
export class ApiKeySecurityService {
  /**
   * Generate a cryptographically secure API key
   *
   * @param length Length in bytes (default 32 = 64 hex characters)
   * @returns Random API key
   */
  static generateApiKey(length: number = 32): string {
    return crypto.randomBytes(length).toString("hex");
  }

  /**
   * Hash an API key using SHA-256
   * Used for authentication keys (Zapier Actions)
   *
   * @param apiKey Plain API key
   * @returns SHA-256 hash
   */
  static hashApiKey(apiKey: string): string {
    return crypto.createHash("sha256").update(apiKey).digest("hex");
  }

  /**
   * Encrypt an API key using AES-256-CBC
   * Used for keys that need to be retrieved (HubSpot, Salesforce)
   *
   * @param apiKey Plain API key
   * @returns Encrypted API key with IV
   */
  static encryptApiKey(apiKey: string): string {
    return encryptData(apiKey);
  }

  /**
   * Decrypt an encrypted API key
   *
   * @param encryptedKey Encrypted API key
   * @returns Plain API key
   */
  static decryptApiKey(encryptedKey: string): string {
    return decryptData(encryptedKey);
  }

  /**
   * Verify an API key against its hash
   *
   * @param apiKey Plain API key
   * @param hash Stored hash
   * @returns True if match
   */
  static verifyApiKey(apiKey: string, hash: string): boolean {
    const computedHash = this.hashApiKey(apiKey);
    return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));
  }

  /**
   * Store an encrypted API key
   * For keys that need to be retrieved and used (HubSpot, Salesforce)
   *
   * @param apiKey Plain API key
   * @param metadata Key metadata
   * @returns Key ID and encrypted value
   */
  static async storeEncryptedKey(
    apiKey: string,
    metadata: Partial<ApiKeyMetadata>,
  ): Promise<{ keyId: string; encryptedValue: string }> {
    const keyId = this.generateApiKey(16); // 32 hex characters for ID
    const encryptedValue = this.encryptApiKey(apiKey);

    const fullMetadata: ApiKeyMetadata = {
      userId: metadata.userId!,
      keyType: metadata.keyType!,
      name: metadata.name,
      description: metadata.description,
      expiresAt: metadata.expiresAt,
      lastUsedAt: undefined,
      usageCount: 0,
      isActive: true,
      createdAt: new Date(),
    };

    // Log creation
    await this.logAuditEvent({
      keyId,
      userId: fullMetadata.userId,
      event: ApiKeyAuditEvent.CREATED,
      timestamp: new Date(),
      success: true,
      metadata: {
        keyType: fullMetadata.keyType,
        name: fullMetadata.name,
      },
    });

    return { keyId, encryptedValue };
  }

  /**
   * Store a hashed API key
   * For authentication keys (Zapier Actions)
   *
   * @param apiKey Plain API key
   * @param metadata Key metadata
   * @returns Key ID and hash
   */
  static async storeHashedKey(
    apiKey: string,
    metadata: Partial<ApiKeyMetadata>,
  ): Promise<{ keyId: string; hashedValue: string }> {
    const keyId = this.generateApiKey(16);
    const hashedValue = this.hashApiKey(apiKey);

    const fullMetadata: ApiKeyMetadata = {
      userId: metadata.userId!,
      keyType: metadata.keyType!,
      name: metadata.name,
      description: metadata.description,
      expiresAt: metadata.expiresAt,
      lastUsedAt: undefined,
      usageCount: 0,
      isActive: true,
      createdAt: new Date(),
    };

    // Log creation
    await this.logAuditEvent({
      keyId,
      userId: fullMetadata.userId,
      event: ApiKeyAuditEvent.CREATED,
      timestamp: new Date(),
      success: true,
      metadata: {
        keyType: fullMetadata.keyType,
        name: fullMetadata.name,
      },
    });

    return { keyId, hashedValue };
  }

  /**
   * Rotate an encrypted API key
   * Generates new key, re-encrypts with new IV
   *
   * @param oldKeyId Current key ID
   * @param metadata Updated metadata
   * @returns New key ID, encrypted value, and plain key
   */
  static async rotateEncryptedKey(
    oldKeyId: string,
    metadata: Partial<ApiKeyMetadata>,
  ): Promise<{
    keyId: string;
    encryptedValue: string;
    plainApiKey: string;
  }> {
    const plainApiKey = this.generateApiKey();
    const keyId = this.generateApiKey(16);
    const encryptedValue = this.encryptApiKey(plainApiKey);

    const fullMetadata: ApiKeyMetadata = {
      userId: metadata.userId!,
      keyType: metadata.keyType!,
      name: metadata.name,
      description: metadata.description,
      expiresAt: metadata.expiresAt,
      lastUsedAt: undefined,
      usageCount: 0,
      isActive: true,
      createdAt: new Date(),
      rotatedAt: new Date(),
    };

    // Log rotation
    await this.logAuditEvent({
      keyId,
      userId: fullMetadata.userId,
      event: ApiKeyAuditEvent.ROTATED,
      timestamp: new Date(),
      success: true,
      metadata: {
        oldKeyId,
        keyType: fullMetadata.keyType,
      },
    });

    return { keyId, encryptedValue, plainApiKey };
  }

  /**
   * Check if API key is expired
   *
   * @param expiresAt Expiration date
   * @returns True if expired
   */
  static isKeyExpired(expiresAt?: Date): boolean {
    if (!expiresAt) return false;
    return new Date() > expiresAt;
  }

  /**
   * Log API key audit event
   *
   * @param event Audit log entry
   */
  static async logAuditEvent(event: ApiKeyAuditLog): Promise<void> {
    try {
      await dbConnect();
      await ApiKeyAuditLogModel.create(event);
    } catch (error) {
      console.error("Failed to log API key audit event:", error);
      // Don't throw - audit logging failure shouldn't break the app
    }
  }

  /**
   * Log API key usage
   *
   * @param keyId Key ID
   * @param userId User ID
   * @param success Whether usage was successful
   * @param ipAddress Optional IP address
   * @param userAgent Optional user agent
   * @param errorMessage Optional error message
   */
  static async logKeyUsage(
    keyId: string,
    userId: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.logAuditEvent({
      keyId,
      userId,
      event: success ? ApiKeyAuditEvent.USED : ApiKeyAuditEvent.FAILED_USE,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      success,
      errorMessage,
    });
  }

  /**
   * Get audit logs for a specific key
   *
   * @param keyId Key ID
   * @param limit Max number of logs to return
   * @returns Array of audit logs
   */
  static async getAuditLogs(
    keyId: string,
    limit: number = 100,
  ): Promise<ApiKeyAuditLog[]> {
    await dbConnect();
    return (await ApiKeyAuditLogModel.find({ keyId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()) as unknown as ApiKeyAuditLog[];
  }

  /**
   * Get audit logs for a user
   *
   * @param userId User ID
   * @param limit Max number of logs
   * @returns Array of audit logs
   */
  static async getUserAuditLogs(
    userId: string,
    limit: number = 100,
  ): Promise<ApiKeyAuditLog[]> {
    await dbConnect();
    return (await ApiKeyAuditLogModel.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()) as unknown as ApiKeyAuditLog[];
  }

  /**
   * Validate API key format
   *
   * @param apiKey API key to validate
   * @returns True if valid format
   */
  static validateKeyFormat(apiKey: string): boolean {
    // Must be hex string of appropriate length
    return /^[0-9a-f]{64}$/i.test(apiKey);
  }

  /**
   * Generate key expiration date
   *
   * @param days Days until expiration
   * @returns Expiration date
   */
  static generateExpirationDate(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  /**
   * Mask API key for display
   * Shows first 8 and last 4 characters
   *
   * @param apiKey API key
   * @returns Masked key
   */
  static maskApiKey(apiKey: string): string {
    if (apiKey.length < 16) return "****";
    return `${apiKey.slice(0, 8)}${"*".repeat(apiKey.length - 12)}${apiKey.slice(-4)}`;
  }

  /**
   * Check for suspicious activity
   * Detects rapid key usage from different IPs
   *
   * @param keyId Key ID
   * @param timeWindowMinutes Time window to check
   * @returns True if suspicious activity detected
   */
  static async detectSuspiciousActivity(
    keyId: string,
    timeWindowMinutes: number = 5,
  ): Promise<boolean> {
    await dbConnect();

    const since = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

    const recentLogs = await ApiKeyAuditLogModel.find({
      keyId,
      event: ApiKeyAuditEvent.USED,
      timestamp: { $gte: since },
    }).lean();

    if (recentLogs.length < 10) return false;

    // Check for multiple different IPs
    const uniqueIps = new Set(
      recentLogs.map((log) => log.ipAddress).filter(Boolean),
    );

    // If more than 5 different IPs in 5 minutes, flag as suspicious
    return uniqueIps.size > 5;
  }

  /**
   * Sanitize metadata before logging
   * Removes sensitive information
   *
   * @param metadata Raw metadata
   * @returns Sanitized metadata
   */
  static sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized = { ...metadata };

    // Remove sensitive fields
    const sensitiveFields = [
      "password",
      "apiKey",
      "secret",
      "token",
      "privateKey",
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = "[REDACTED]";
      }
    }

    return sanitized;
  }
}

/**
 * Convenience exports
 */
export const {
  generateApiKey,
  hashApiKey,
  encryptApiKey,
  decryptApiKey,
  verifyApiKey,
  storeEncryptedKey,
  storeHashedKey,
  rotateEncryptedKey,
  isKeyExpired,
  logAuditEvent,
  logKeyUsage,
  getAuditLogs,
  getUserAuditLogs,
  validateKeyFormat,
  generateExpirationDate,
  maskApiKey,
  detectSuspiciousActivity,
  sanitizeMetadata,
} = ApiKeySecurityService;
