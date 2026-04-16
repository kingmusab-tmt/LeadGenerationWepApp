import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  ApiError,
  handleValidationError,
  internalError,
  databaseError,
  externalServiceError,
  ErrorCode,
} from "./error-handler";
import { logApiError, errorLogger } from "./error-logger";
import mongoose from "mongoose";

// ============================================
// ROUTE HANDLER TYPE
// ============================================

export type RouteHandler = (
  req: NextRequest,
  context?: {
    params: Promise<Record<string, string>> | Record<string, string>;
  },
) => Promise<NextResponse>;

export type RouteHandlerWithParams = (
  req: NextRequest,
  context: { params: Promise<Record<string, string>> | Record<string, string> },
) => Promise<NextResponse>;

type RouteContext = {
  params: Promise<Record<string, string>> | Record<string, string>;
};

type SessionUser = {
  id: string;
  email?: string | null;
  role?: string | null;
};

type AuthenticatedSession = {
  user: SessionUser;
};

// ============================================
// ASYNC ROUTE WRAPPER
// ============================================

/**
 * Wraps async route handlers with comprehensive error handling
 *
 * Usage:
 * export const GET = withErrorHandler(async (req) => {
 *   // Your route logic
 *   return successResponse(data);
 * });
 */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, context?: RouteContext) => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleError(error, req);
    }
  };
}

/**
 * Wraps async route handlers with params
 */
export function withErrorHandlerParams(
  handler: RouteHandlerWithParams,
): RouteHandlerWithParams {
  return async (req: NextRequest, context: RouteContext) => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleError(error, req);
    }
  };
}

// ============================================
// CENTRALIZED ERROR HANDLER
// ============================================

function handleError(error: unknown, req: NextRequest): NextResponse {
  const { searchParams } = new URL(req.url);

  logApiError(error, req);
  if (searchParams.size > 0) {
    errorLogger.info("API request params on error", {
      method: req.method,
      params: Object.fromEntries(searchParams),
    });
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return handleValidationError(error);
  }

  // Handle custom API errors
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        ...(error.details && { details: error.details }),
        timestamp: new Date().toISOString(),
      },
      { status: error.statusCode },
    );
  }

  // Handle Mongoose validation errors
  if (error instanceof mongoose.Error.ValidationError) {
    const details: Record<string, string[]> = {};
    Object.keys(error.errors).forEach((key) => {
      details[key] = [error.errors[key].message];
    });

    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        code: ErrorCode.VALIDATION_ERROR,
        details,
        timestamp: new Date().toISOString(),
      },
      { status: 400 },
    );
  }

  // Handle Mongoose duplicate key errors
  if (
    error instanceof Error &&
    error.name === "MongoServerError" &&
    (error as any).code === 11000
  ) {
    const field = Object.keys((error as any).keyPattern || {})[0] || "field";
    return NextResponse.json(
      {
        success: false,
        error: `Duplicate ${field} already exists`,
        code: ErrorCode.DUPLICATE_ENTRY,
        details: { field, value: (error as any).keyValue?.[field] },
        timestamp: new Date().toISOString(),
      },
      { status: 409 },
    );
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (error instanceof mongoose.Error.CastError) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid ${error.path}: ${error.value}`,
        code: ErrorCode.BAD_REQUEST,
        details: { field: error.path, value: error.value },
        timestamp: new Date().toISOString(),
      },
      { status: 400 },
    );
  }

  // Handle Mongoose connection errors
  if (error instanceof mongoose.Error.MongooseServerSelectionError) {
    return NextResponse.json(
      {
        success: false,
        error: "Database connection failed",
        code: ErrorCode.CONNECTION_ERROR,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  // Handle generic Mongoose errors
  if (error instanceof mongoose.Error) {
    return databaseError(error.message);
  }

  // Handle Stripe errors
  if (error instanceof Error && error.name === "StripeError") {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: ErrorCode.STRIPE_ERROR,
        timestamp: new Date().toISOString(),
      },
      { status: 502 },
    );
  }

  // Handle Twilio errors
  if (
    error instanceof Error &&
    (error.constructor.name.includes("Twilio") || (error as any).status)
  ) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: ErrorCode.TWILIO_ERROR,
        details: { status: (error as any).status },
        timestamp: new Date().toISOString(),
      },
      { status: 502 },
    );
  }

  // Handle generic Error instances
  if (error instanceof Error) {
    // Check for known error patterns
    if (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("ETIMEDOUT")
    ) {
      return externalServiceError("External service", error.message);
    }

    // Don't expose internal error messages in production
    const isProduction = process.env.NODE_ENV === "production";
    return internalError(
      isProduction ? "An unexpected error occurred" : error.message,
    );
  }

  // Unknown error type
  return internalError("An unexpected error occurred");
}

// ============================================
// LOGGING HELPER
// ============================================

export function logError(
  error: unknown,
  context: {
    path: string;
    method: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  errorLogger.logError(error, context);
}

// ============================================
// VALIDATION WRAPPER
// ============================================

/**
 * Wraps route handler with request body validation
 *
 * Usage:
 * export const POST = withValidation(createLeadSchema, async (req, validatedData) => {
 *   const lead = await Lead.create(validatedData);
 *   return successResponse({ lead }, 201);
 * });
 */
export function withValidation<T>(
  schema: { parseAsync: (data: unknown) => Promise<T> },
  handler: (req: NextRequest, data: T, context?: any) => Promise<NextResponse>,
): RouteHandler {
  return withErrorHandler(async (req, context) => {
    const body = await req.json();
    const validatedData = await schema.parseAsync(body);
    return handler(req, validatedData, context);
  });
}

/**
 * Wraps route handler with query parameter validation
 */
export function withQueryValidation<T>(
  schema: { parseAsync: (data: unknown) => Promise<T> },
  handler: (
    req: NextRequest,
    queryData: T,
    context?: any,
  ) => Promise<NextResponse>,
): RouteHandler {
  return withErrorHandler(async (req, context) => {
    const searchParams = Object.fromEntries(new URL(req.url).searchParams);
    const validatedData = await schema.parseAsync(searchParams);
    return handler(req, validatedData, context);
  });
}

// ============================================
// AUTHENTICATION WRAPPER
// ============================================

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

/**
 * Wraps route handler with authentication check
 *
 * Usage:
 * export const GET = withAuth(async (req, session) => {
 *   const data = await getData(session.user.id);
 *   return successResponse({ data });
 * });
 */
export function withAuth(
  handler: (
    req: NextRequest,
    session: {
      user: SessionUser;
    },
    context?: any,
  ) => Promise<NextResponse>,
  options?: { requireRole?: string[] },
): RouteHandler {
  return withErrorHandler(async (req, context) => {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      throw new ApiError(
        401,
        ErrorCode.UNAUTHORIZED,
        "Authentication required",
      );
    }

    // Role-based access control
    if (options?.requireRole && session.user.role) {
      if (!options.requireRole.includes(session.user.role)) {
        throw new ApiError(
          403,
          ErrorCode.FORBIDDEN,
          `Required role: ${options.requireRole.join(" or ")}`,
        );
      }
    }

    return handler(req, session as AuthenticatedSession, context);
  });
}

/**
 * Combines authentication and validation
 */
export function withAuthAndValidation<T>(
  schema: { parseAsync: (data: unknown) => Promise<T> },
  handler: (
    req: NextRequest,
    session: {
      user: SessionUser;
    },
    data: T,
    context?: any,
  ) => Promise<NextResponse>,
  options?: { requireRole?: string[] },
): RouteHandler {
  return withAuth(async (req, session, context) => {
    const body = await req.json();
    const validatedData = await schema.parseAsync(body);
    return handler(req, session, validatedData, context);
  }, options);
}
