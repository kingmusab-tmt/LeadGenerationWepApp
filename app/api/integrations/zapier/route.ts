/**
 * Zapier Webhook Configuration API
 * Allows users to set up Zapier webhooks for automation workflows
 *
 * Date: January 21, 2026
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes } from "crypto";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { WebhookConfig } from "@/models/webhookConfig";
import { User } from "@/models/userModel";
import { ZapierIntegrationService } from "@/lib/integrations/services/zapierService";
import {
  badRequest,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/zapier
 * Get Zapier webhook configuration for current user
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

    const userId = String(user._id);

    // Find Zapier webhook configs
    const zapierConfigs = await WebhookConfig.find({
      userId,
      source: "zapier",
      isActive: true,
    });

    return NextResponse.json({
      configs: zapierConfigs,
      count: zapierConfigs.length,
    });
  } catch (error) {
    console.error("Error fetching Zapier configs:", error);
    return internalError("Failed to fetch Zapier configurations");
  }
}

/**
 * POST /api/integrations/zapier
 * Create new Zapier webhook configuration
 */
export async function POST(req: NextRequest) {
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

    const userId = String(user._id);

    const body = await req.json();
    const { webhookUrl, events, description } = body;

    // Validate webhook URL
    if (!webhookUrl || !webhookUrl.startsWith("https://hooks.zapier.com/")) {
      return badRequest("Invalid Zapier webhook URL");
    }

    // Validate events
    if (!events || Object.keys(events).length === 0) {
      return badRequest("At least one event must be enabled");
    }

    // Generate secret for webhook signing
    const secret = randomBytes(32).toString("hex");

    // Create webhook config
    const webhookConfig = await WebhookConfig.create({
      userId,
      url: webhookUrl,
      source: "zapier",
      secret: secret,
      isActive: true,
      events: events,
      description: description || "Zapier Integration",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Test the webhook
    const zapierService = new ZapierIntegrationService(
      webhookUrl,
      secret,
      userId,
    );

    const testSuccess = await zapierService.testConnection();

    return NextResponse.json({
      success: true,
      config: {
        id: webhookConfig._id,
        url: webhookConfig.url,
        events: webhookConfig.events,
        description: webhookConfig.description,
        isActive: webhookConfig.isActive,
        testSuccess: testSuccess,
      },
      message: testSuccess
        ? "Zapier webhook configured successfully"
        : "Zapier webhook configured, but test failed. Please check your Zap.",
    });
  } catch (error) {
    console.error("Error creating Zapier config:", error);
    return internalError("Failed to create Zapier configuration");
  }
}

/**
 * DELETE /api/integrations/zapier/[id]
 * Delete Zapier webhook configuration
 */
export async function DELETE(req: NextRequest) {
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

    const userId = String(user._id);

    // Get config ID from URL
    const url = new URL(req.url);
    const configId = url.pathname.split("/").pop();

    if (!configId) {
      return badRequest("Configuration ID required");
    }

    // Find and delete config
    const config = await WebhookConfig.findOneAndDelete({
      _id: configId,
      userId,
      source: "zapier",
    });

    if (!config) {
      return notFound("Configuration");
    }

    return NextResponse.json({
      success: true,
      message: "Zapier webhook configuration deleted",
    });
  } catch (error) {
    console.error("Error deleting Zapier config:", error);
    return internalError("Failed to delete Zapier configuration");
  }
}
