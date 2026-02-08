/**
 * Secure API Key Storage Middleware
 * Provides secure storage patterns for different integration types
 *
 * Date: January 21, 2026
 */

import { User } from "@/models/userModel";
import {
  ApiKeySecurityService,
  ApiKeyType,
  generateExpirationDate,
} from "./apiKeySecurityService";

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
    (user.apiSettings as any).zapierApiKeyId = keyId;
    (user.apiSettings as any).zapierApiKeyHash = hashedValue;
    (user.apiSettings as any).zapierApiKeyCreatedAt = new Date();
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
  const createdAt = (user.apiSettings as any)?.zapierApiKeyCreatedAt;
  const expiresAt = generateExpirationDate(365);

  if (createdAt && new Date(createdAt) > expiresAt) {
    return { valid: false };
  }

  // Log usage
  const keyId = (user.apiSettings as any)?.zapierApiKeyId;
  if (keyId) {
    await ApiKeySecurityService.logKeyUsage(
      keyId,
      (user._id as any).toString(),
      true,
    );
  }

  return {
    valid: true,
    userId: (user._id as any).toString(),
  };
}

/**
 * Revoke all API keys for a user
 */
export async function revokeAllUserKeys(userId: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user?.apiSettings) return;

  const apiSettings = user.apiSettings as any;

  // Log revocations
  if (apiSettings.zapierApiKeyId) {
    await ApiKeySecurityService.logAuditEvent({
      keyId: apiSettings.zapierApiKeyId,
      userId,
      event: "revoked" as any,
      timestamp: new Date(),
      success: true,
    });
  }

  // Clear all keys
  delete apiSettings.zapierApiKeyId;
  delete apiSettings.zapierApiKeyHash;

  await user.save();
}
