/**
 * Webhook Management API - Dynamic Routes
 * PUT /api/integrations/webhooks/[id] - Update webhook
 * DELETE /api/integrations/webhooks/[id] - Delete webhook
 * GET /api/integrations/webhooks/[id] - Get webhook details
 *
 * Date: January 21, 2026
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { WebhookConfig } from "@/models/webhookConfig";
import { encryptData } from "@/lib/encryption";
import { z } from "zod";
import type { Types } from "mongoose";

export const dynamic = "force-dynamic";

/**
 * Update validation schema
 */
const updateWebhookSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  url: z.string().url().optional(),
  events: z
    .object({
      leadCreated: z.boolean().optional(),
      leadUpdated: z.boolean().optional(),
      leadQualified: z.boolean().optional(),
      leadAccepted: z.boolean().optional(),
      leadRejected: z.boolean().optional(),
      buyerAssigned: z.boolean().optional(),
      callCompleted: z.boolean().optional(),
      dealCreated: z.boolean().optional(),
      dealUpdated: z.boolean().optional(),
    })
    .optional(),
  headers: z.record(z.string(), z.string()).optional(),
  maxRetriesPerEvent: z.number().min(0).max(10).optional(),
  retryDelaySeconds: z.number().min(10).max(3600).optional(),
  rateLimit: z
    .object({
      maxPerMinute: z.number().min(1).optional(),
      maxPerHour: z.number().min(1).optional(),
    })
    .optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

/**
 * Get authenticated user and verify webhook ownership
 */
async function verifyWebhookOwnership(webhookId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { error: "Unauthorized", status: 401 };
  }

  if (!webhookId || !webhookId.match(/^[0-9a-fA-F]{24}$/)) {
    return { error: "Invalid webhook ID", status: 400 };
  }

  const webhook = await WebhookConfig.findById(webhookId);
  if (!webhook) {
    return { error: "Webhook not found", status: 404 };
  }

  if (webhook.userId.toString() !== (session.user as any)._id) {
    return { error: "Forbidden", status: 403 };
  }

  return { webhook, user: session.user };
}

/**
 * GET /api/integrations/webhooks/[id]
 * Get webhook details with logs and statistics
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbConnect();

  try {
    const { id } = await params;
    const result = await verifyWebhookOwnership(id);
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    const webhook = (result as any).webhook as any;
    const { searchParams } = new URL(req.url);
    const includeLogs = searchParams.get("logs") === "true";
    const logsLimit = parseInt(searchParams.get("logsLimit") || "50");
    const includeDailyStats = searchParams.get("dailyStats") === "true";

    const webhookData: any = webhook.toObject();

    // Add statistics
    if (includeDailyStats) {
      webhookData.dailyStats = await webhook.getDailyStats();
    }

    // Add dispatch logs if requested
    if (includeLogs) {
      webhookData.dispatchLogs = webhook.dispatchLogs?.slice(-logsLimit) || [];
    } else {
      // Remove logs from default response
      delete webhookData.dispatchLogs;
    }

    // Add computed fields
    webhookData.successRate = webhook.getSuccessRate?.() || 0;
    webhookData.isHealthy = webhook.isHealthy?.() || false;

    // Don't send encrypted secret
    delete webhookData.secret;

    return NextResponse.json({
      success: true,
      data: webhookData,
    });
  } catch (error) {
    console.error("Error fetching webhook:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhook" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/integrations/webhooks/[id]
 * Update webhook configuration
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbConnect();

  try {
    const { id } = await params;
    const result = await verifyWebhookOwnership(id);
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    const webhook = (result as any).webhook as any;
    const body = await req.json();

    let validatedData;
    try {
      validatedData = updateWebhookSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: error.issues,
          },
          { status: 400 },
        );
      }
      throw error;
    }

    // Update fields
    if (validatedData.name) webhook.name = validatedData.name;
    if (validatedData.description !== undefined) {
      webhook.description = validatedData.description;
    }
    if (validatedData.url) webhook.url = validatedData.url;

    if (validatedData.events) {
      webhook.events = {
        ...webhook.events,
        ...validatedData.events,
      };
    }

    if (validatedData.headers) {
      webhook.headers = validatedData.headers as Record<string, string>;
    }
    if (validatedData.maxRetriesPerEvent !== undefined) {
      webhook.maxRetriesPerEvent = validatedData.maxRetriesPerEvent;
    }
    if (validatedData.retryDelaySeconds !== undefined) {
      webhook.retryDelaySeconds = validatedData.retryDelaySeconds;
    }

    if (validatedData.rateLimit) {
      webhook.rateLimit = {
        ...webhook.rateLimit,
        ...validatedData.rateLimit,
      };
    }

    if (validatedData.isActive !== undefined) {
      webhook.isActive = validatedData.isActive;
    }

    if (validatedData.tags) webhook.tags = validatedData.tags;
    if (validatedData.notes !== undefined) webhook.notes = validatedData.notes;

    // Validate at least one event is enabled
    const hasEnabledEvent = Object.values(webhook.events).some(
      (v) => v === true,
    );
    if (!hasEnabledEvent) {
      return NextResponse.json(
        { error: "At least one event must be enabled" },
        { status: 400 },
      );
    }

    await webhook.save();

    const webhookData: any = webhook.toObject();
    webhookData.successRate = webhook.getSuccessRate?.() || 0;
    webhookData.isHealthy = webhook.isHealthy?.() || false;
    delete webhookData.secret;

    return NextResponse.json({
      success: true,
      message: "Webhook updated successfully",
      data: webhookData,
    });
  } catch (error) {
    console.error("Error updating webhook:", error);
    return NextResponse.json(
      { error: "Failed to update webhook" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/integrations/webhooks/[id]
 * Delete a webhook
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbConnect();

  try {
    const { id } = await params;
    const result = await verifyWebhookOwnership(id);
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    const webhook = (result as any).webhook as any;

    // Log deletion for audit trail
    const deletedData = webhook.toObject();

    await WebhookConfig.deleteOne({ _id: webhook._id });

    return NextResponse.json({
      success: true,
      message: "Webhook deleted successfully",
      data: {
        id: webhook._id,
        name: webhook.name,
        source: webhook.source,
      },
    });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return NextResponse.json(
      { error: "Failed to delete webhook" },
      { status: 500 },
    );
  }
}
