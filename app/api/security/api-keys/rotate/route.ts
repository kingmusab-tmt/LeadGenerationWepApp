/**
 * API Key Rotation Endpoint
 * Allows users to rotate their API keys for enhanced security
 *
 * Date: January 21, 2026
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/userModel";
import { storeZapierActionApiKey } from "@/lib/security/apiKeyStorage";
import { ApiKeySecurityService } from "@/lib/security/apiKeySecurityService";

export const dynamic = "force-dynamic";

/**
 * POST /api/security/api-keys/rotate
 * Rotate an API key
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

    const userId = (user._id as any).toString();
    const body = await req.json();
    const { keyType, newKey } = body;

    if (!keyType) {
      return NextResponse.json(
        { error: "Key type is required" },
        { status: 400 },
      );
    }

    switch (keyType) {
      case "zapier":
        // Generate new Zapier key
        const newZapierKey = ApiKeySecurityService.generateApiKey();
        await storeZapierActionApiKey(userId, newZapierKey);
        return NextResponse.json({
          success: true,
          message: "Zapier API key rotated successfully",
          apiKey: newZapierKey,
          keyType: "zapier",
          warning: "Save this key - it won't be shown again!",
        });

      default:
        return NextResponse.json(
          { error: "Invalid key type" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Error rotating API key:", error);
    return NextResponse.json(
      { error: "Failed to rotate API key" },
      { status: 500 },
    );
  }
}
