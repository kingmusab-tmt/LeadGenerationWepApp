/**
 * Zapier API Key Management
 * Allows users to generate and manage API keys for Zapier actions
 *
 * Date: January 21, 2026
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/userModel";
import {
  ApiKeyAuditEvent,
  ApiKeySecurityService,
  ApiKeyType,
} from "@/lib/security/apiKeySecurityService";
import { checkFeatureAccess } from "@/lib/subscriptionLimitsService";
import {
  internalError,
  notFound,
  unauthorized,
  forbidden,
} from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

type ZapierApiSettings = {
  twilioSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  zapierApiKeyHash?: string;
  zapierApiKeyTruncated?: string;
  zapierApiKeyCreatedAt?: Date;
};

/**
 * POST /api/integrations/zapier/api-key
 * Generate a new API key for Zapier actions
 */
export async function POST() {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return unauthorized("Authentication required");
    }

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return notFound("User");
    }

    // Check Zapier integration feature access
    const featureCheck = await checkFeatureAccess(
      String(user._id),
      "zapierIntegration",
    );
    if (!featureCheck.allowed) {
      return forbidden(
        "Zapier integration is not available on your current plan. Please upgrade to access this feature.",
      );
    }

    // Generate new API key (32 random bytes = 64 hex characters)
    const apiKey = ApiKeySecurityService.generateApiKey();

    // Hash the API key for storage
    const apiKeyHash = ApiKeySecurityService.hashApiKey(apiKey);

    // Store hash in user document
    if (!user.apiSettings) {
      user.apiSettings = {
        twilioSid: "",
        twilioAuthToken: "",
        twilioPhoneNumber: "",
      };
    }

    // Store hash + truncated preview (first 8 + last 4 chars)
    const truncatedKey = `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`;
    const apiSettings = user.apiSettings as ZapierApiSettings;
    const hadExistingKey = !!apiSettings.zapierApiKeyHash;
    apiSettings.zapierApiKeyHash = apiKeyHash;
    apiSettings.zapierApiKeyTruncated = truncatedKey;
    apiSettings.zapierApiKeyCreatedAt = new Date();

    await user.save();

    await ApiKeySecurityService.logAuditEvent({
      keyId: apiKeyHash,
      userId: String(user._id),
      event: hadExistingKey
        ? ApiKeyAuditEvent.ROTATED
        : ApiKeyAuditEvent.CREATED,
      timestamp: new Date(),
      success: true,
      metadata: { keyType: ApiKeyType.ZAPIER_ACTION },
    });

    // Return the API key (ONLY TIME IT'S SHOWN TO USER)
    return NextResponse.json({
      success: true,
      apiKey: apiKey,
      message:
        "API key generated successfully. Save this key - it will not be shown again!",
      warning:
        "This API key grants access to create and modify leads. Keep it secure.",
    });
  } catch (error) {
    console.error("Error generating API key:", error);
    return internalError("Failed to generate API key");
  }
}

/**
 * DELETE /api/integrations/zapier/api-key
 * Revoke/delete the current API key
 */
export async function DELETE() {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return unauthorized("Authentication required");
    }

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return notFound("User");
    }

    // Remove API key hash
    if (user.apiSettings) {
      const apiSettings = user.apiSettings as ZapierApiSettings;
      const revokedKeyHash = apiSettings.zapierApiKeyHash;
      delete apiSettings.zapierApiKeyHash;
      delete apiSettings.zapierApiKeyTruncated;
      delete apiSettings.zapierApiKeyCreatedAt;
      await user.save();

      if (revokedKeyHash) {
        await ApiKeySecurityService.logAuditEvent({
          keyId: revokedKeyHash,
          userId: String(user._id),
          event: ApiKeyAuditEvent.REVOKED,
          timestamp: new Date(),
          success: true,
          metadata: { keyType: ApiKeyType.ZAPIER_ACTION },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "API key revoked successfully",
    });
  } catch (error) {
    console.error("Error revoking API key:", error);
    return internalError("Failed to revoke API key");
  }
}

/**
 * GET /api/integrations/zapier/api-key
 * Check if API key exists (doesn't return the key itself)
 */
export async function GET() {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return unauthorized("Authentication required");
    }

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return notFound("User");
    }

    const apiSettings = (user.apiSettings || {}) as ZapierApiSettings;
    const hasApiKey = !!apiSettings.zapierApiKeyHash;
    const createdAt = apiSettings.zapierApiKeyCreatedAt;
    const truncatedKey = apiSettings.zapierApiKeyTruncated || null;

    return NextResponse.json({
      exists: hasApiKey,
      createdAt: createdAt || null,
      truncatedKey: hasApiKey ? truncatedKey : null,
      message: hasApiKey
        ? "API key is active"
        : "No API key configured. Generate one to use Zapier actions.",
    });
  } catch (error) {
    console.error("Error checking API key:", error);
    return internalError("Failed to check API key");
  }
}
