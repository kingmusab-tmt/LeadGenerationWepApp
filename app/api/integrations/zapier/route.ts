/**
 * Zapier Webhook Configuration API
 * Allows users to set up Zapier webhooks for automation workflows
 *
 * Date: January 21, 2026
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/connectdb";
import { WebhookConfig, IWebhookConfig } from "@/models/webhookConfig";
import { User } from "@/models/userModel";
import { ZapierIntegrationService } from "@/lib/integrations/services/zapierService";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/zapier
 * Get Zapier webhook configuration for current user
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

    // Find Zapier webhook configs
    const zapierConfigs = await WebhookConfig.find({
      userId: (user._id as any).toString(),
      source: "zapier",
      isActive: true,
    });

    return NextResponse.json({
      configs: zapierConfigs,
      count: zapierConfigs.length,
    });
  } catch (error) {
    console.error("Error fetching Zapier configs:", error);
    return NextResponse.json(
      { error: "Failed to fetch Zapier configurations" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/integrations/zapier
 * Create new Zapier webhook configuration
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

    const body = await req.json();
    const { webhookUrl, events, description } = body;

    // Validate webhook URL
    if (!webhookUrl || !webhookUrl.startsWith("https://hooks.zapier.com/")) {
      return NextResponse.json(
        { error: "Invalid Zapier webhook URL" },
        { status: 400 },
      );
    }

    // Validate events
    if (!events || Object.keys(events).length === 0) {
      return NextResponse.json(
        { error: "At least one event must be enabled" },
        { status: 400 },
      );
    }

    // Generate secret for webhook signing
    const secret = require("crypto").randomBytes(32).toString("hex");

    // Create webhook config
    const webhookConfig = await WebhookConfig.create({
      userId: (user._id as any).toString(),
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
      (user._id as any).toString(),
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
    return NextResponse.json(
      { error: "Failed to create Zapier configuration" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/integrations/zapier/[id]
 * Delete Zapier webhook configuration
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

    // Get config ID from URL
    const url = new URL(req.url);
    const configId = url.pathname.split("/").pop();

    if (!configId) {
      return NextResponse.json(
        { error: "Configuration ID required" },
        { status: 400 },
      );
    }

    // Find and delete config
    const config = await WebhookConfig.findOneAndDelete({
      _id: configId,
      userId: (user._id as any).toString(),
      source: "zapier",
    });

    if (!config) {
      return NextResponse.json(
        { error: "Configuration not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Zapier webhook configuration deleted",
    });
  } catch (error) {
    console.error("Error deleting Zapier config:", error);
    return NextResponse.json(
      { error: "Failed to delete Zapier configuration" },
      { status: 500 },
    );
  }
}
