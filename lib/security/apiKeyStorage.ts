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
 * Store HubSpot API Key (encrypted)
 * HubSpot keys need to be retrieved to make API calls
 */
export async function storeHubSpotApiKey(
  userId: string,
  apiKey: string,
): Promise<void> {
  const { keyId, encryptedValue } =
    await ApiKeySecurityService.storeEncryptedKey(apiKey, {
      userId,
      keyType: ApiKeyType.HUBSPOT,
      name: "HubSpot API Key",
      description: "Used for HubSpot CRM integration",
      expiresAt: generateExpirationDate(365), // 1 year
    });

  // Store in user document
  const user = await User.findById(userId);
  if (user) {
    if (!user.apiSettings) {
      user.apiSettings = {
        twilioSid: "",
        twilioAuthToken: "",
        twilioPhoneNumber: "",
      };
    }
    (user.apiSettings as any).hubspotKeyId = keyId;
    (user.apiSettings as any).hubspotApiKeyEncrypted = encryptedValue;
    (user.apiSettings as any).hubspotKeyCreatedAt = new Date();
    await user.save();
  }
}

/**
 * Retrieve HubSpot API Key (decrypted)
 */
export async function getHubSpotApiKey(userId: string): Promise<string | null> {
  const user = await User.findById(userId);
  if (!user?.apiSettings) return null;

  const encryptedKey = (user.apiSettings as any).hubspotApiKeyEncrypted;
  if (!encryptedKey) return null;

  try {
    return ApiKeySecurityService.decryptApiKey(encryptedKey);
  } catch (error) {
    console.error("Failed to decrypt HubSpot API key:", error);
    return null;
  }
}

/**
 * Rotate HubSpot API Key
 */
export async function rotateHubSpotApiKey(
  userId: string,
  newApiKey: string,
): Promise<void> {
  const user = await User.findById(userId);
  if (!user?.apiSettings) throw new Error("User not found");

  const oldKeyId = (user.apiSettings as any).hubspotKeyId;

  const { keyId, encryptedValue } =
    await ApiKeySecurityService.rotateEncryptedKey(oldKeyId, {
      userId,
      keyType: ApiKeyType.HUBSPOT,
      name: "HubSpot API Key",
      description: "Used for HubSpot CRM integration",
      expiresAt: generateExpirationDate(365),
    });

  // Update stored key
  (user.apiSettings as any).hubspotKeyId = keyId;
  (user.apiSettings as any).hubspotApiKeyEncrypted =
    ApiKeySecurityService.encryptApiKey(newApiKey);
  (user.apiSettings as any).hubspotKeyRotatedAt = new Date();
  await user.save();
}

/**
 * Store Salesforce Credentials (encrypted)
 */
export async function storeSalesforceCredentials(
  userId: string,
  credentials: {
    instanceUrl: string;
    clientId: string;
    clientSecret: string;
    username: string;
    password: string;
    securityToken: string;
  },
): Promise<void> {
  const { keyId, encryptedValue } =
    await ApiKeySecurityService.storeEncryptedKey(JSON.stringify(credentials), {
      userId,
      keyType: ApiKeyType.SALESFORCE,
      name: "Salesforce Credentials",
      description: "OAuth 2.0 credentials for Salesforce integration",
      expiresAt: generateExpirationDate(365),
    });

  const user = await User.findById(userId);
  if (user) {
    if (!user.apiSettings) {
      user.apiSettings = {
        twilioSid: "",
        twilioAuthToken: "",
        twilioPhoneNumber: "",
      };
    }
    (user.apiSettings as any).salesforceKeyId = keyId;
    (user.apiSettings as any).salesforceCredentialsEncrypted = encryptedValue;
    (user.apiSettings as any).salesforceKeyCreatedAt = new Date();
    await user.save();
  }
}

/**
 * Retrieve Salesforce Credentials (decrypted)
 */
export async function getSalesforceCredentials(userId: string): Promise<{
  instanceUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  securityToken: string;
} | null> {
  const user = await User.findById(userId);
  if (!user?.apiSettings) return null;

  const encryptedCreds = (user.apiSettings as any)
    .salesforceCredentialsEncrypted;
  if (!encryptedCreds) return null;

  try {
    const decrypted = ApiKeySecurityService.decryptApiKey(encryptedCreds);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("Failed to decrypt Salesforce credentials:", error);
    return null;
  }
}

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
  if (apiSettings.hubspotKeyId) {
    await ApiKeySecurityService.logAuditEvent({
      keyId: apiSettings.hubspotKeyId,
      userId,
      event: "revoked" as any,
      timestamp: new Date(),
      success: true,
    });
  }

  if (apiSettings.salesforceKeyId) {
    await ApiKeySecurityService.logAuditEvent({
      keyId: apiSettings.salesforceKeyId,
      userId,
      event: "revoked" as any,
      timestamp: new Date(),
      success: true,
    });
  }

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
  delete apiSettings.hubspotKeyId;
  delete apiSettings.hubspotApiKeyEncrypted;
  delete apiSettings.salesforceKeyId;
  delete apiSettings.salesforceCredentialsEncrypted;
  delete apiSettings.zapierApiKeyId;
  delete apiSettings.zapierApiKeyHash;

  await user.save();
}
