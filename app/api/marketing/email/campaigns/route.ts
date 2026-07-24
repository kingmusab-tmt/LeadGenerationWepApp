// GET /api/email-campaigns - List all campaigns
// POST /api/email-campaigns - Create new campaign
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { EmailCampaign } from "@/models/emailCampaign";
import {
  createEmailCampaignSchema,
  getEmailCampaignsQuerySchema,
} from "@/lib/validation/schemas";
import {
  successResponse,
  unauthorized,
  forbidden,
  internalError,
  handleValidationError,
  badRequest,
} from "@/lib/api/error-handler";
import { ZodError } from "zod";
import { checkFeatureAccess } from "@/lib/subscriptionLimitsService";
import { requireCsrf } from "@/lib/security/requireCsrf";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";
import { sanitizeEmailHtml } from "@/lib/sanitizeEmailHtml";

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
    const query: Record<string, unknown> = {
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

    const csrfError = requireCsrf(req, session.user.email);
    if (csrfError) return csrfError;

    const rateLimited = await checkSimpleRateLimit(req, {
      scope: "email-campaigns-create",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      actorId: session.user.id,
    });
    if (rateLimited) return rateLimited;

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

    // Check feature access for email campaigns
    const featureAccess = await checkFeatureAccess(
      session.user.id,
      "emailCampaignsEnabled",
    );
    if (!featureAccess.allowed) {
      return forbidden(
        featureAccess.message ||
          "Email campaigns are not available for your subscription",
      );
    }

    // Create campaign
    const recipientEmails = validatedData.recipientList || [];
    const campaign = new EmailCampaign({
      userId: session.user.id,
      name: validatedData.name,
      subject: validatedData.subject,
      htmlContent: sanitizeEmailHtml(
        validatedData.htmlContent || validatedData.body || "",
      ),
      textContent: validatedData.textContent || "",
      fromEmail: validatedData.fromEmail || "",
      fromName: validatedData.fromName || "",
      replyTo: validatedData.replyTo,
      recipientEmails,
      totalRecipients: recipientEmails.length,
      status: "draft",
      schedule: { type: "immediate" },
      tags: validatedData.tags || [],
      goals: validatedData.goals,
      abTesting: validatedData.abTesting && {
        ...validatedData.abTesting,
        variantContent: validatedData.abTesting.variantContent
          ? sanitizeEmailHtml(validatedData.abTesting.variantContent)
          : validatedData.abTesting.variantContent,
      },
      createdAt: new Date(),
    });

    const savedCampaign = await campaign.save();

    return successResponse(
      {
        campaign: savedCampaign,
      },
      201,
    );
  } catch (error: unknown) {
    console.error("[POST /api/email-campaigns]", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return badRequest("Campaign with this name already exists");
    }
    return internalError("Failed to create campaign");
  }
}
