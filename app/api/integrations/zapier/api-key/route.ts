/**
 * Zapier API Key Management
 * Allows users to generate and manage API keys for Zapier actions
 *
 * Date: January 21, 2026
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/userModel";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/integrations/zapier/api-key
 * Generate a new API key for Zapier actions
 */
export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate new API key (32 random bytes = 64 hex characters)
    const apiKey = crypto.randomBytes(32).toString("hex");

    // Hash the API key for storage
    const apiKeyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    // Store hash in user document
    if (!user.apiSettings) {
      user.apiSettings = {
        twilioSid: "",
        twilioAuthToken: "",
        twilioPhoneNumber: "",
      };
    }

    (user.apiSettings as any).zapierApiKeyHash = apiKeyHash;
    (user.apiSettings as any).zapierApiKeyCreatedAt = new Date();

    await user.save();

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
    return NextResponse.json(
      { error: "Failed to generate API key" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/integrations/zapier/api-key
 * Revoke/delete the current API key
 */
export async function DELETE(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Remove API key hash
    if (user.apiSettings) {
      delete (user.apiSettings as any).zapierApiKeyHash;
      delete (user.apiSettings as any).zapierApiKeyCreatedAt;
      await user.save();
    }

    return NextResponse.json({
      success: true,
      message: "API key revoked successfully",
    });
  } catch (error) {
    console.error("Error revoking API key:", error);
    return NextResponse.json(
      { error: "Failed to revoke API key" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/integrations/zapier/api-key
 * Check if API key exists (doesn't return the key itself)
 */
export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hasApiKey = !!(user.apiSettings as any)?.zapierApiKeyHash;
    const createdAt = (user.apiSettings as any)?.zapierApiKeyCreatedAt;

    return NextResponse.json({
      exists: hasApiKey,
      createdAt: createdAt || null,
      message: hasApiKey
        ? "API key is active"
        : "No API key configured. Generate one to use Zapier actions.",
    });
  } catch (error) {
    console.error("Error checking API key:", error);
    return NextResponse.json(
      { error: "Failed to check API key" },
      { status: 500 },
    );
  }
}
