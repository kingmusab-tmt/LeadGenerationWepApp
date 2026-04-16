import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { SmsCampaign } from "@/models/smsCampaign";
import { paginationSchema } from "@/lib/validation/schemas";
import {
  successResponse,
  unauthorized,
  forbidden,
  internalError,
  badRequest,
} from "@/lib/api/error-handler";
import { ZodError } from "zod";
import { checkAndIncrementUsage } from "@/lib/subscriptionLimitsService";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketing/sms/campaigns
 * Fetch all SMS campaigns for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    let queryParams;
    try {
      queryParams = await paginationSchema.parseAsync(
        Object.fromEntries(new URL(req.url).searchParams),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return badRequest("Invalid query parameters");
      }
      return badRequest("Invalid query parameters");
    }

    await dbConnect();

    const [items, total] = await Promise.all([
      SmsCampaign.find({ userId: session.user.id })
        .sort({ createdAt: -1 })
        .skip((queryParams.page - 1) * queryParams.limit)
        .limit(queryParams.limit)
        .lean(),
      SmsCampaign.countDocuments({ userId: session.user.id }),
    ]);

    return successResponse({
      items,
      pagination: {
        page: queryParams.page,
        limit: queryParams.limit,
        total,
        pages: Math.ceil(total / queryParams.limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/marketing/sms/campaigns]", error);
    return internalError("Failed to fetch SMS campaigns");
  }
}

/**
 * POST /api/marketing/sms/campaigns
 * Create a new SMS campaign
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const body = await req.json();
    const { name, textContent, recipients, schedule, fromPhoneNumber } = body;

    if (!name || !textContent) {
      return badRequest("Campaign name and message are required");
    }

    await dbConnect();

    // Check subscription limit for SMS campaigns
    const usageCheck = await checkAndIncrementUsage(
      session.user.id,
      "smsCampaigns",
      1,
    );
    if (!usageCheck.allowed) {
      return forbidden(
        usageCheck.message ||
          "SMS campaign limit reached for your subscription",
      );
    }

    const campaign = await SmsCampaign.create({
      userId: session.user.id,
      name,
      textContent,
      fromPhoneNumber: fromPhoneNumber || undefined,
      recipients: recipients || [],
      scheduleAt: schedule?.scheduledTime
        ? new Date(schedule.scheduledTime)
        : undefined,
      status: schedule?.scheduledTime ? "scheduled" : "draft",
      stats: {
        queued: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        clicks: 0,
        replies: 0,
        optOuts: 0,
      },
    });

    return successResponse(campaign, 201);
  } catch (error: unknown) {
    console.error("[POST /api/marketing/sms/campaigns]", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return badRequest("Campaign with this name already exists");
    }
    return internalError("Failed to create SMS campaign");
  }
}
