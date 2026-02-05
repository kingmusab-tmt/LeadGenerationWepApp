// GET /api/email-campaigns - List all campaigns
// POST /api/email-campaigns - Create new campaign
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import {
  EmailCampaign,
  EmailTemplate,
  EmailSegment,
} from "@/models/emailCampaign";
import { emailMarketingEngine } from "@/lib/emailMarketingEngine";
import {
  createEmailCampaignSchema,
  getEmailCampaignsQuerySchema,
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
 * GET /api/email-campaigns
 * Fetch all campaigns for the authenticated user with pagination
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized();
    }

    // Validate query parameters
    let queryParams;
    try {
      queryParams = await getEmailCampaignsQuerySchema.parseAsync(
        Object.fromEntries(new URL(req.url).searchParams),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid query parameters");
    }

    await dbConnect();

    // Build query
    const query: Record<string, any> = {
      userId: session.user.id,
    };
    if (queryParams.status) {
      query.status = queryParams.status;
    }

    // Get total count
    const total = await EmailCampaign.countDocuments(query);

    // Get campaigns with pagination
    const campaigns = await EmailCampaign.find(query)
      .sort({ createdAt: -1 })
      .skip((queryParams.page - 1) * queryParams.limit)
      .limit(queryParams.limit)
      .select(
        "name subject status schedule analytics totalRecipients sentCount sentAt createdAt",
      )
      .lean();

    return successResponse(
      {
        campaigns,
        pagination: {
          page: queryParams.page,
          limit: queryParams.limit,
          total,
          pages: Math.ceil(total / queryParams.limit),
        },
      },
      200,
    );
  } catch (error) {
    console.error("[GET /api/email-campaigns]", error);
    return internalError("Failed to fetch campaigns");
  }
}

/**
 * POST /api/email-campaigns
 * Create a new email campaign
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized();
    }

    // Validate request body
    let validatedData;
    try {
      const body = await req.json();
      validatedData = await createEmailCampaignSchema.parseAsync(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid request body");
    }

    await dbConnect();

    // Validate template if provided
    if (validatedData.template) {
      const template = await EmailTemplate.findById(validatedData.template);
      if (!template) {
        return badRequest("Template not found");
      }
    }

    // Create campaign
    const campaign = new EmailCampaign({
      userId: session.user.id,
      name: validatedData.name,
      subject: validatedData.subject,
      body: validatedData.body,
      recipientEmails: validatedData.recipientList,
      totalRecipients: validatedData.recipientList.length,
      status: "draft",
      schedule: validatedData.schedule || { type: "immediate" },
      tags: validatedData.tags || [],
      templateId: validatedData.template,
      createdAt: new Date(),
    });

    const savedCampaign = await campaign.save();

    return successResponse(
      {
        campaign: savedCampaign,
      },
      201,
    );
  } catch (error: any) {
    console.error("[POST /api/email-campaigns]", error);
    if (error.code === 11000) {
      return badRequest("Campaign with this name already exists");
    }
    return internalError("Failed to create campaign");
  }
}
