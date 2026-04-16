import { NextRequest, NextResponse } from "next/server";
import { Lead } from "@/models/leads";
import dbConnect from "@/lib/connectdb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  invalidateLeadCache,
  invalidateAllUserSessions,
} from "@/lib/cachedSession"; // PHASE 2: Cache invalidation
import {
  createLeadSchema,
  updateLeadSchema,
  getLeadsQuerySchema,
  mongoIdParamSchema,
} from "@/lib/validation/schemas";
import {
  successResponse,
  unauthorized,
  notFound,
  internalError,
  handleValidationError,
  badRequest,
  forbidden,
} from "@/lib/api/error-handler";
import { ZodError } from "zod";
import { checkAndIncrementUsage } from "@/lib/subscriptionLimitsService";

// GET /api/leads - Fetch all leads with pagination
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorized();
    }

    // Validate query parameters
    let queryParams;
    try {
      queryParams = await getLeadsQuerySchema.parseAsync(
        Object.fromEntries(new URL(req.url).searchParams),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid query parameters");
    }

    await dbConnect();

    const query: Record<string, string> = {};
    if (session.user.role !== "admin") {
      query.userId = session.user.id;
    }
    if (queryParams.status) {
      query.status = queryParams.status;
    }
    if (queryParams.source) {
      query.leadSource = queryParams.source;
    }

    const skip = (queryParams.page - 1) * queryParams.limit;
    const total = await Lead.countDocuments(query);
    const leads = await Lead.find(query)
      .skip(skip)
      .limit(queryParams.limit)
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(
      {
        leads,
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
    console.error("[GET /api/leads]", error);
    return internalError("Failed to fetch leads");
  }
}

// POST /api/leads - Create a new lead
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorized();
    }

    // Validate request body
    let validatedData;
    try {
      const body = await req.json();
      validatedData = await createLeadSchema.parseAsync(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid request body");
    }

    await dbConnect();

    // Check subscription limit for leads
    const usageCheck = await checkAndIncrementUsage(
      session.user.id,
      "leads",
      1,
    );
    if (!usageCheck.allowed) {
      return forbidden(
        usageCheck.message ||
          `Lead limit reached (${usageCheck.currentUsage}/${usageCheck.limit}). Please upgrade your plan.`,
      );
    }

    const newLead = new Lead({
      ...validatedData,
      userId: session.user.id,
      createdAt: new Date(),
    });

    await newLead.save();

    // PHASE 2: Invalidate user cache after creating lead
    await invalidateAllUserSessions(session.user.id);

    return successResponse({ lead: newLead }, 201);
  } catch (error: unknown) {
    console.error("[POST /api/leads]", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return badRequest("Lead with this email already exists");
    }
    return internalError("Failed to create lead");
  }
}

// PUT /api/leads - Update a lead
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("id");

    if (!leadId) {
      return badRequest("Lead ID is required");
    }

    // Validate ID
    try {
      mongoIdParamSchema.parse(leadId);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid lead ID");
    }

    // Validate body
    let validatedData;
    try {
      const body = await req.json();
      validatedData = await updateLeadSchema.parseAsync(body);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error(
          "[PUT /api/leads] Zod validation error:",
          JSON.stringify(error.issues, null, 2),
        );
        return handleValidationError(error);
      }
      return badRequest("Invalid request body");
    }

    await dbConnect();

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return notFound("Lead");
    }

    // Verify ownership (unless admin)
    if (
      session.user.role !== "admin" &&
      lead.userId.toString() !== session.user.id
    ) {
      return unauthorized("You cannot modify this lead");
    }

    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      { $set: { ...validatedData, updatedAt: new Date() } },
      { new: true, runValidators: true },
    );

    // PHASE 2: Invalidate caches after updating lead
    await invalidateLeadCache(leadId);
    await invalidateAllUserSessions(session.user.id);

    return successResponse({ lead: updatedLead }, 200);
  } catch (error: unknown) {
    console.error("[PUT /api/leads]", error);
    return internalError("Failed to update lead");
  }
}

// DELETE /api/leads - Delete a lead
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("id");

    if (!leadId) {
      return badRequest("Lead ID is required");
    }

    // Validate ID
    try {
      mongoIdParamSchema.parse(leadId);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid lead ID");
    }

    await dbConnect();

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return notFound("Lead");
    }

    // Verify ownership (unless admin)
    if (
      session.user.role !== "admin" &&
      lead.userId.toString() !== session.user.id
    ) {
      return unauthorized("You cannot delete this lead");
    }

    await Lead.findByIdAndDelete(leadId);

    // PHASE 2: Invalidate caches after deleting lead
    await invalidateLeadCache(leadId);
    await invalidateAllUserSessions(session.user.id);

    return successResponse({ message: "Lead deleted successfully" }, 200);
  } catch (error) {
    console.error("[DELETE /api/leads]", error);
    return internalError("Failed to delete lead");
  }
}
