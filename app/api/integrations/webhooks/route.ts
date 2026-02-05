/**
 * Webhook Management API Endpoints
 * GET /api/integrations/webhooks - List webhooks
 * POST /api/integrations/webhooks - Create webhook
 *
 * Date: January 21, 2026
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { WebhookConfig, IWebhookConfig } from "@/models/webhookConfig";
import { encryptData } from "@/lib/encryption";
import crypto from "crypto";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * Validation schemas
 */
const createWebhookSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  url: z.string().url(),
  source: z.enum(["zapier", "hubspot", "salesforce", "custom"]),
  events: z.object({
    leadCreated: z.boolean().optional(),
    leadUpdated: z.boolean().optional(),
    leadQualified: z.boolean().optional(),
    leadAccepted: z.boolean().optional(),
    leadRejected: z.boolean().optional(),
    buyerAssigned: z.boolean().optional(),
    callCompleted: z.boolean().optional(),
    dealCreated: z.boolean().optional(),
    dealUpdated: z.boolean().optional(),
  }),
  headers: z.record(z.string(), z.string()).optional(),
  maxRetriesPerEvent: z.number().min(0).max(10).optional(),
  retryDelaySeconds: z.number().min(10).max(3600).optional(),
  rateLimit: z
    .object({
      maxPerMinute: z.number().min(1).optional(),
      maxPerHour: z.number().min(1).optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

/**
 * Get server session and validate user
 */
async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { error: "Unauthorized", status: 401 };
  }
  return { user: session.user };
}

/**
 * GET /api/integrations/webhooks
 * List all webhooks for authenticated user
 */
export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const authResult = await getAuthenticatedUser();
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status },
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const source = searchParams.get("source");
    const isActive = searchParams.get("isActive");

    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Invalid pagination parameters" },
        { status: 400 },
      );
    }

    // Build filter query
    const filter: Record<string, unknown> = {
      userId: (authResult.user as any)._id,
    };

    if (source) {
      filter.source = source;
    }

    if (isActive !== null) {
      filter.isActive = isActive === "true";
    }

    // Fetch webhooks
    const skip = (page - 1) * limit;
    const webhooks = await WebhookConfig.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-secret"); // Don't send secret to client

    const total = await WebhookConfig.countDocuments(filter);

    // Add computed fields
    const webhooksWithStats = webhooks.map((webhook: any) => {
      const webhookObj = webhook.toObject();
      return {
        ...webhookObj,
        successRate: (webhook as any).getSuccessRate?.() || 0,
        isHealthy: (webhook as any).isHealthy?.() || false,
      };
    });

    return NextResponse.json({
      success: true,
      data: webhooksWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhooks" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/integrations/webhooks
 * Create a new webhook
 */
export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const authResult = await getAuthenticatedUser();
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status },
      );
    }

    // Parse and validate request body
    const body = await req.json();

    let validatedData;
    try {
      validatedData = createWebhookSchema.parse(body);
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

    // Ensure at least one event is enabled
    const hasEnabledEvent = Object.values(validatedData.events).some(
      (v) => v === true,
    );
    if (!hasEnabledEvent) {
      return NextResponse.json(
        { error: "At least one event must be enabled" },
        { status: 400 },
      );
    }

    // Generate secure secret
    const secret = crypto.randomBytes(32).toString("hex");

    // Encrypt secret before storing
    const encryptedSecret = encryptData(secret);

    // Create webhook
    const webhook = new WebhookConfig({
      userId: (authResult.user as any)._id,
      name: validatedData.name,
      description: validatedData.description,
      url: validatedData.url,
      source: validatedData.source,
      events: {
        leadCreated: validatedData.events.leadCreated ?? false,
        leadUpdated: validatedData.events.leadUpdated ?? false,
        leadQualified: validatedData.events.leadQualified ?? false,
        leadAccepted: validatedData.events.leadAccepted ?? false,
        leadRejected: validatedData.events.leadRejected ?? false,
        buyerAssigned: validatedData.events.buyerAssigned ?? false,
        callCompleted: validatedData.events.callCompleted ?? false,
        dealCreated: validatedData.events.dealCreated ?? false,
        dealUpdated: validatedData.events.dealUpdated ?? false,
      },
      secret: encryptedSecret,
      headers: validatedData.headers,
      maxRetriesPerEvent: validatedData.maxRetriesPerEvent,
      retryDelaySeconds: validatedData.retryDelaySeconds,
      rateLimit: validatedData.rateLimit,
      tags: validatedData.tags,
      notes: validatedData.notes,
    });

    await webhook.save();

    // Return webhook with unencrypted secret (only shown once)
    const webhookData = webhook.toObject();
    return NextResponse.json(
      {
        success: true,
        message: "Webhook created successfully",
        data: {
          ...webhookData,
          secret, // Unencrypted secret - only shown once
        },
        warning: "Save this secret - you won't be able to see it again",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating webhook:", error);
    return NextResponse.json(
      { error: "Failed to create webhook" },
      { status: 500 },
    );
  }
}
