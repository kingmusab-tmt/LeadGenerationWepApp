import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { SmsCampaign } from "@/models/smsCampaign";
import {
  createSMSCampaignSchema,
  paginationSchema,
} from "@/lib/validation/schemas";
import {
  successResponse,
  unauthorized,
  internalError,
  handleValidationError,
  badRequest,
} from "@/lib/api/error-handler";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

/**
 * GET /api/sms-campaigns
 * Fetch all SMS campaigns for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    // Validate query parameters
    let queryParams;
    try {
      queryParams = await paginationSchema.parseAsync(
        Object.fromEntries(new URL(req.url).searchParams),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
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
    console.error("[GET /api/sms-campaigns]", error);
    return internalError("Failed to fetch SMS campaigns");
  }
}

/**
 * POST /api/sms-campaigns
 * Create a new SMS campaign
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    // Validate request body
    let validatedData;
    try {
      const body = await req.json();
      validatedData = await createSMSCampaignSchema.parseAsync(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid request body");
    }

    await dbConnect();

    const campaign = await SmsCampaign.create({
      userId: session.user.id,
      name: validatedData.name,
      message: validatedData.message,
      recipientList: validatedData.recipientList,
      schedule: validatedData.schedule,
      status: validatedData.schedule?.scheduledTime ? "scheduled" : "draft",
      stats: {
        queued: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        clicks: 0,
        replies: 0,
        optOuts: 0,
      },
      createdAt: new Date(),
    });

    return successResponse(campaign, 201);
  } catch (error: any) {
    console.error("[POST /api/sms-campaigns]", error);
    if (error.code === 11000) {
      return badRequest("Campaign with this name already exists");
    }
    return internalError("Failed to create SMS campaign");
  }
}
