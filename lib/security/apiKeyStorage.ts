/**
 * Secure API Key Storage Middleware
 * Provides secure storage patterns for different integration types
 *
 * Date: January 21, 2026
 */

import { User } from "@/models/userModel";
import {
  ApiKeyAuditEvent,
  ApiKeySecurityService,
  ApiKeyType,
  generateExpirationDate,
} from "./apiKeySecurityService";

type ZapierApiKeyFields = {
  zapierApiKeyId?: string;
  zapierApiKeyHash?: string;
  zapierApiKeyCreatedAt?: Date;
};

/**
 * Store Zapier Action API Key (hashed)
 * Zapier keys are used for authentication only
 */
export async function storeZapierActionApiKey(
  userId: string,
  apiKey: string,
): Promise<void> {
  const { keyId, hashedValue } = await ApiKeySecurityService.storeHashedKey(
    apiKey,
    {
      userId,
      keyType: ApiKeyType.ZAPIER_ACTION,
      name: "Zapier Actions API Key",
      description: "Used for Zapier to perform actions in BRIXCOT",
      expiresAt: generateExpirationDate(365),
    },
  );

  const user = await User.findById(userId);
  if (user) {
    if (!user.apiSettings) {
      user.apiSettings = {
        twilioSid: "",
        twilioAuthToken: "",
        twilioPhoneNumber: "",
      };
    }
    const apiSettings = user.apiSettings as typeof user.apiSettings &
      ZapierApiKeyFields;
    apiSettings.zapierApiKeyId = keyId;
    apiSettings.zapierApiKeyHash = hashedValue;
    apiSettings.zapierApiKeyCreatedAt = new Date();
    await user.save();
  }
}

/**
 * Verify Zapier Action API Key
 */
export async function verifyZapierActionApiKey(
  apiKey: string,
): Promise<{ valid: boolean; userId?: string }> {
  const hash = ApiKeySecurityService.hashApiKey(apiKey);

  const user = await User.findOne({
    "apiSettings.zapierApiKeyHash": hash,
  });

  if (!user) {
    return { valid: false };
  }

  // Check if expired
  const apiSettings = (user.apiSettings || {}) as ZapierApiKeyFields;
  const createdAt = apiSettings.zapierApiKeyCreatedAt;

  if (createdAt) {
    const expiryDate = new Date(createdAt);
    expiryDate.setDate(expiryDate.getDate() + 365);

    if (new Date() > expiryDate) {
      return { valid: false };
    }
  }

  // Log usage
  const keyId = apiSettings.zapierApiKeyId;
  if (keyId) {
    await ApiKeySecurityService.logKeyUsage(keyId, String(user._id), true);
  }

  return {
    valid: true,
    userId: String(user._id),
  };
}

/**
 * Revoke all API keys for a user
 */
export async function revokeAllUserKeys(userId: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user?.apiSettings) return;

  const apiSettings = user.apiSettings as typeof user.apiSettings &
    ZapierApiKeyFields;

  // Log revocations
  if (apiSettings.zapierApiKeyId) {
    await ApiKeySecurityService.logAuditEvent({
      keyId: apiSettings.zapierApiKeyId,
      userId,
      event: ApiKeyAuditEvent.REVOKED,
      timestamp: new Date(),
      success: true,
    });
  }

  // Clear all keys
  delete apiSettings.zapierApiKeyId;
  delete apiSettings.zapierApiKeyHash;

  await user.save();
}
