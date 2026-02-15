import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { AutomationWorkflow } from "@/models/automationWorkflow";
import {
  createAutomationWorkflowSchema,
  paginationSchema,
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
import { checkAndIncrementUsage } from "@/lib/subscriptionLimitsService";

export const dynamic = "force-dynamic";

async function getUserFromSession() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "seller" || !session.user.id) {
    return {
      error: unauthorized(),
    };
  }
  return { userId: session.user.id };
}

export async function GET(req: NextRequest) {
  await dbConnect();
  const { userId, error } = await getUserFromSession();
  if (error) return error;

  try {
    // Validate query parameters
    let queryParams;
    try {
      const params = Object.fromEntries(new URL(req.url).searchParams);
      queryParams = await paginationSchema.parseAsync(params);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid query parameters");
    }

    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get("isActive");

    const filter: Record<string, unknown> = { userId };
    if (isActive !== null) {
      filter.isActive = isActive === "true";
    }

    const workflows = await AutomationWorkflow.find(filter)
      .sort({ createdAt: -1 })
      .skip((queryParams.page - 1) * queryParams.limit)
      .limit(queryParams.limit);

    const total = await AutomationWorkflow.countDocuments(filter);

    return successResponse({
      workflows,
      pagination: {
        page: queryParams.page,
        limit: queryParams.limit,
        total,
        pages: Math.ceil(total / queryParams.limit),
      },
    });
  } catch (err) {
    console.error("Error fetching workflows:", err);
    return internalError("Failed to fetch workflows");
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const { userId, error } = await getUserFromSession();
  if (error) return error;

  try {
    // Validate request body
    let validatedData;
    try {
      const body = await req.json();
      validatedData = await createAutomationWorkflowSchema.parseAsync(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid request body");
    }

    // Check subscription limit for automation workflows
    const usageCheck = await checkAndIncrementUsage(
      userId,
      "automationWorkflows",
      1,
    );
    if (!usageCheck.allowed) {
      return forbidden(
        usageCheck.message ||
          "Automation workflow limit reached for your subscription",
      );
    }

    const workflow = new AutomationWorkflow({
      userId,
      name: validatedData.name,
      description: validatedData.description || "",
      enabled: validatedData.enabled !== false,
      trigger: validatedData.trigger,
      actions: validatedData.actions,
    });

    await workflow.save();

    return successResponse({ workflow }, 201);
  } catch (err) {
    console.error("Error creating workflow:", err);
    return internalError("Failed to create workflow");
  }
}
