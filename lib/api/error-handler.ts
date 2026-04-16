import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

// ============================================
// ERROR TYPES
// ============================================

export enum ErrorCode {
  // Client Errors (4xx)
  VALIDATION_ERROR = "VALIDATION_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  BAD_REQUEST = "BAD_REQUEST",
  UNPROCESSABLE_ENTITY = "UNPROCESSABLE_ENTITY",
  RATE_LIMITED = "RATE_LIMITED",
  PAYMENT_REQUIRED = "PAYMENT_REQUIRED",
  METHOD_NOT_ALLOWED = "METHOD_NOT_ALLOWED",
  REQUEST_TIMEOUT = "REQUEST_TIMEOUT",
  GONE = "GONE",
  PAYLOAD_TOO_LARGE = "PAYLOAD_TOO_LARGE",

  // Server Errors (5xx)
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  NOT_IMPLEMENTED = "NOT_IMPLEMENTED",
  BAD_GATEWAY = "BAD_GATEWAY",
  GATEWAY_TIMEOUT = "GATEWAY_TIMEOUT",

  // Business Logic Errors
  INSUFFICIENT_CREDITS = "INSUFFICIENT_CREDITS",
  SUBSCRIPTION_EXPIRED = "SUBSCRIPTION_EXPIRED",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  DUPLICATE_ENTRY = "DUPLICATE_ENTRY",
  INVALID_STATE = "INVALID_STATE",
  OPERATION_FAILED = "OPERATION_FAILED",

  // Database Errors
  DATABASE_ERROR = "DATABASE_ERROR",
  QUERY_ERROR = "QUERY_ERROR",
  CONNECTION_ERROR = "CONNECTION_ERROR",

  // External Service Errors
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  TWILIO_ERROR = "TWILIO_ERROR",
  STRIPE_ERROR = "STRIPE_ERROR",
  EMAIL_SERVICE_ERROR = "EMAIL_SERVICE_ERROR",
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code: ErrorCode;
  details?: Record<string, unknown>;
  timestamp?: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp?: string;
}

// ============================================
// ERROR HANDLER
// ============================================

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type MongoDuplicateKeyError = Error & {
  code: number;
  keyPattern?: Record<string, unknown>;
  keyValue?: Record<string, unknown>;
};

type TwilioLikeError = Error & {
  status?: number;
};

function isMongoDuplicateKeyError(
  error: unknown,
): error is MongoDuplicateKeyError {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as MongoDuplicateKeyError).code === 11000
  );
}

function isTwilioLikeError(error: unknown): error is TwilioLikeError {
  return error instanceof Error && "status" in error;
}

// ============================================
// RESPONSE BUILDERS
// ============================================

export function successResponse<T>(data: T, statusCode = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    } as ApiSuccessResponse<T>,
    { status: statusCode },
  );
}

export function errorResponse(
  message: string,
  statusCode: number,
  code: ErrorCode,
  details?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
    } as ApiErrorResponse,
    { status: statusCode },
  );
}

// ============================================
// VALIDATION ERROR HANDLER
// ============================================

export function handleValidationError(error: ZodError<unknown>) {
  const details: Record<string, string[]> = {};

  error.issues.forEach((issue) => {
    const path = issue.path.join(".");
    if (!details[path]) {
      details[path] = [];
    }
    details[path].push(issue.message);
  });

  return errorResponse(
    "Validation failed",
    400,
    ErrorCode.VALIDATION_ERROR,
    details,
  );
}

// ============================================
// COMMON ERRORS
// ============================================

export function unauthorized(message = "Unauthorized") {
  return errorResponse(message, 401, ErrorCode.UNAUTHORIZED);
}

export function forbidden(message = "Forbidden") {
  return errorResponse(message, 403, ErrorCode.FORBIDDEN);
}

export function notFound(resource = "Resource", message?: string) {
  return errorResponse(
    message || `${resource} not found`,
    404,
    ErrorCode.NOT_FOUND,
  );
}

export function conflict(message: string) {
  return errorResponse(message, 409, ErrorCode.CONFLICT);
}

export function badRequest(message: string, details?: Record<string, unknown>) {
  return errorResponse(message, 400, ErrorCode.BAD_REQUEST, details);
}

export function internalError(message = "Internal server error") {
  return errorResponse(message, 500, ErrorCode.INTERNAL_ERROR);
}

export function rateLimited(message = "Too many requests") {
  return errorResponse(message, 429, ErrorCode.RATE_LIMITED);
}

export function unprocessableEntity(
  message: string,
  details?: Record<string, unknown>,
) {
  return errorResponse(message, 422, ErrorCode.UNPROCESSABLE_ENTITY, details);
}

export function methodNotAllowed(message = "Method not allowed") {
  return errorResponse(message, 405, ErrorCode.METHOD_NOT_ALLOWED);
}

export function paymentRequired(message = "Payment required") {
  return errorResponse(message, 402, ErrorCode.PAYMENT_REQUIRED);
}

export function serviceUnavailable(
  message = "Service temporarily unavailable",
) {
  return errorResponse(message, 503, ErrorCode.SERVICE_UNAVAILABLE);
}

export function payloadTooLarge(message = "Request payload too large") {
  return errorResponse(message, 413, ErrorCode.PAYLOAD_TOO_LARGE);
}

export function requestTimeout(message = "Request timeout") {
  return errorResponse(message, 408, ErrorCode.REQUEST_TIMEOUT);
}

// ============================================
// BUSINESS LOGIC ERRORS
// ============================================

export function insufficientCredits(message = "Insufficient credits") {
  return errorResponse(message, 402, ErrorCode.INSUFFICIENT_CREDITS);
}

export function subscriptionExpired(message = "Subscription has expired") {
  return errorResponse(message, 403, ErrorCode.SUBSCRIPTION_EXPIRED);
}

export function quotaExceeded(message = "Quota exceeded") {
  return errorResponse(message, 429, ErrorCode.QUOTA_EXCEEDED);
}

export function duplicateEntry(
  message: string,
  details?: Record<string, unknown>,
) {
  return errorResponse(message, 409, ErrorCode.DUPLICATE_ENTRY, details);
}

export function invalidState(message: string) {
  return errorResponse(message, 422, ErrorCode.INVALID_STATE);
}

// ============================================
// DATABASE ERRORS
// ============================================

export function databaseError(
  message = "Database operation failed",
  details?: Record<string, unknown>,
) {
  return errorResponse(message, 500, ErrorCode.DATABASE_ERROR, details);
}

export function connectionError(message = "Database connection failed") {
  return errorResponse(message, 503, ErrorCode.CONNECTION_ERROR);
}

// ============================================
// EXTERNAL SERVICE ERRORS
// ============================================

export function externalServiceError(service: string, message?: string) {
  return errorResponse(
    message || `${service} service error`,
    502,
    ErrorCode.EXTERNAL_SERVICE_ERROR,
    { service },
  );
}

export function twilioError(
  message: string,
  details?: Record<string, unknown>,
) {
  return errorResponse(message, 502, ErrorCode.TWILIO_ERROR, details);
}

export function stripeError(
  message: string,
  details?: Record<string, unknown>,
) {
  return errorResponse(message, 502, ErrorCode.STRIPE_ERROR, details);
}

export function emailServiceError(message: string) {
  return errorResponse(message, 502, ErrorCode.EMAIL_SERVICE_ERROR);
}

// ============================================
// ASYNC ERROR WRAPPER
// ============================================

export function asyncHandler(fn: (req: Request) => Promise<NextResponse>) {
  return async (req: Request) => {
    try {
      return await fn(req);
    } catch (error) {
      console.error("[API Error]", error);

      if (error instanceof ZodError) {
        return handleValidationError(error);
      }

      if (error instanceof ApiError) {
        return errorResponse(
          error.message,
          error.statusCode,
          error.code,
          error.details,
        );
      }

      if (error instanceof Error) {
        return internalError(error.message);
      }

      return internalError();
    }
  };
}

// ============================================
// VALIDATION WRAPPER
// ============================================

export async function validateRequest<T>(
  req: Request,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const data = await req.json();
  return schema.parseAsync(data);
}

export async function validateQuery<T>(
  url: string,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const searchParams = new URL(url).searchParams;
  const data = Object.fromEntries(searchParams);
  return schema.parseAsync(data);
}

export function validateParam<T>(
  value: string | string[] | undefined,
  schema: z.ZodSchema<T>,
): T {
  return schema.parse(value);
}

// ============================================
// MIDDLEWARE FOR VALIDATION
// ============================================

export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return async (
    req: Request,
  ): Promise<
    { valid: true; data: T } | { valid: false; response: NextResponse }
  > => {
    try {
      const data = await validateRequest<T>(req, schema as z.ZodSchema<T>);
      return { valid: true, data };
    } catch (error) {
      if (error instanceof ZodError) {
        return { valid: false, response: handleValidationError(error) };
      }
      return { valid: false, response: internalError() };
    }
  };
}
