// ============================================
// API ROUTE VALIDATION TEMPLATE
// ============================================
// Copy this template and customize for each API route
// Replace SCHEMA_NAME and endpoint with actual values

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { ZodError } from "zod";

// Import validation schemas
// import { createLeadSchema } from "@/lib/validation/schemas";
// import { paginationSchema } from "@/lib/validation/schemas";

// Import error handlers
import {
  successResponse,
  unauthorized,
  notFound,
  internalError,
  handleValidationError,
  badRequest,
  forbidden,
} from "@/lib/api/error-handler";

/**
 * GET /api/endpoint
 * Description: ENDPOINT DESCRIPTION
 * Auth: Required
 * Query Parameters: page, limit
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorized();
    }

    // Optional: Validate query parameters
    // let queryParams;
    // try {
    //   queryParams = await paginationSchema.parseAsync(
    //     Object.fromEntries(new URL(req.url).searchParams)
    //   );
    // } catch (error) {
    //   if (error instanceof ZodError) {
    //     return handleValidationError(error);
    //   }
    //   return badRequest("Invalid query parameters");
    // }

    await dbConnect();

    // TODO: Implement GET logic
    const result: any[] = [];

    return successResponse({ data: result }, 200);
  } catch (error) {
    console.error("[GET /api/endpoint]", error);
    return internalError();
  }
}

/**
 * POST /api/endpoint
 * Description: ENDPOINT DESCRIPTION
 * Auth: Required
 * Body: createLeadSchema
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorized();
    }

    // Validate request body
    // let validatedData;
    // try {
    //   const body = await req.json();
    //   validatedData = await createLeadSchema.parseAsync(body);
    // } catch (error) {
    //   if (error instanceof ZodError) {
    //     return handleValidationError(error);
    //   }
    //   return badRequest("Invalid request body");
    // }

    await dbConnect();

    // TODO: Implement POST logic
    const result: any = {};

    return successResponse({ data: result }, 201);
  } catch (error: any) {
    console.error("[POST /api/endpoint]", error);
    return internalError();
  }
}

/**
 * PUT /api/endpoint
 * Description: ENDPOINT DESCRIPTION
 * Auth: Required
 * Params: id (MongoDB ID)
 * Body: updateLeadSchema
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // Validate ID
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return badRequest("Invalid ID");
    }

    // Validate body
    // let validatedData;
    // try {
    //   const body = await req.json();
    //   validatedData = await updateLeadSchema.parseAsync(body);
    // } catch (error) {
    //   if (error instanceof ZodError) {
    //     return handleValidationError(error);
    //   }
    //   return badRequest("Invalid request body");
    // }

    await dbConnect();

    // TODO: Verify ownership and permissions
    // TODO: Implement PUT logic
    const result: any = {};

    return successResponse({ data: result }, 200);
  } catch (error) {
    console.error("[PUT /api/endpoint]", error);
    return internalError();
  }
}

/**
 * DELETE /api/endpoint
 * Description: ENDPOINT DESCRIPTION
 * Auth: Required
 * Params: id (MongoDB ID)
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // Validate ID
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return badRequest("Invalid ID");
    }

    await dbConnect();

    // TODO: Verify ownership and permissions
    // TODO: Implement DELETE logic

    return successResponse({ message: "Deleted successfully" }, 200);
  } catch (error) {
    console.error("[DELETE /api/endpoint]", error);
    return internalError();
  }
}

// ============================================
// ADDITIONAL HELPERS
// ============================================

/**
 * Helper to check user permissions
 */
function checkPermission(session: any, resource: any): boolean {
  // Check if user is admin or owner
  return session.user.role === "admin" || resource.userId === session.user.id;
}

/**
 * Helper to build query filters
 */
function buildQuery(session: any, filters?: Record<string, any>) {
  const query: Record<string, any> = {};

  // Add user filter if not admin
  if (session.user.role !== "admin") {
    query.userId = session.user.id;
  }

  // Merge additional filters
  if (filters) {
    Object.assign(query, filters);
  }

  return query;
}
