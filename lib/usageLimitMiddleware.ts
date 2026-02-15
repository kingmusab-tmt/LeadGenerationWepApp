/**
 * Usage Limit Enforcement Middleware
 * Utilities for enforcing subscription limits in API routes
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  checkAndIncrementUsage,
  canPerformAction,
  checkFeatureAccess,
  UsageIncrementResult,
  LimitCheckResult,
  FeatureAccessResult,
} from "@/lib/subscriptionLimitsService";
import { ISubscriptionLimits } from "@/models/types/subscription";

/**
 * Configuration for limit enforcement
 */
export interface LimitEnforcementConfig {
  usageKey: string;
  amount?: number;
  enforceSoftLimit?: boolean;
  checkOnly?: boolean; // If true, only check without incrementing
  featureKey?: keyof ISubscriptionLimits; // For boolean feature checks
}

/**
 * Result of limit enforcement
 */
export interface LimitEnforcementResult {
  allowed: boolean;
  message?: string;
  usage?: UsageIncrementResult | LimitCheckResult;
  feature?: FeatureAccessResult;
}

/**
 * Enforce usage limit for an API route
 * Call this at the start of your API handler to check/enforce limits
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const enforcement = await enforceLimitForRequest(request, {
 *     usageKey: "leads",
 *     amount: 1,
 *   });
 *
 *   if (!enforcement.allowed) {
 *     return NextResponse.json(
 *       { success: false, message: enforcement.message },
 *       { status: 403 }
 *     );
 *   }
 *
 *   // Proceed with creating the lead...
 * }
 * ```
 */
export async function enforceLimitForRequest(
  request: NextRequest,
  config: LimitEnforcementConfig,
): Promise<LimitEnforcementResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      allowed: false,
      message: "Unauthorized",
    };
  }

  return enforceLimit(session.user.id, config);
}

/**
 * Enforce usage limit for a specific user
 *
 * @example
 * ```typescript
 * const enforcement = await enforceLimit(userId, {
 *   usageKey: "forms",
 *   checkOnly: true, // Just check, don't increment yet
 * });
 *
 * if (!enforcement.allowed) {
 *   throw new Error(enforcement.message);
 * }
 *
 * // Create the form...
 *
 * // Then increment after success
 * await checkAndIncrementUsage(userId, "forms", 1);
 * ```
 */
export async function enforceLimit(
  userId: string,
  config: LimitEnforcementConfig,
): Promise<LimitEnforcementResult> {
  const {
    usageKey,
    amount = 1,
    enforceSoftLimit = false,
    checkOnly = false,
    featureKey,
  } = config;

  // Check feature access if specified
  if (featureKey) {
    const featureResult = await checkFeatureAccess(userId, featureKey);
    if (!featureResult.allowed) {
      return {
        allowed: false,
        message: featureResult.message,
        feature: featureResult,
      };
    }
  }

  // Check or increment usage limit
  if (checkOnly) {
    const result = await canPerformAction(userId, usageKey, amount);
    return {
      allowed: result.allowed,
      message: result.message,
      usage: result,
    };
  } else {
    const result = await checkAndIncrementUsage(userId, usageKey, amount, {
      sendNotifications: true,
      enforceSoftLimit,
    });
    return {
      allowed: result.allowed,
      message: result.message,
      usage: result,
    };
  }
}

/**
 * Create a limit-enforced API handler wrapper
 * Wraps your API handler with automatic limit enforcement
 *
 * @example
 * ```typescript
 * const createLeadHandler = withLimitEnforcement(
 *   { usageKey: "leads" },
 *   async (request, session) => {
 *     // Your handler logic here - limits already checked and incremented
 *     const body = await request.json();
 *     const lead = await createLead(body);
 *     return NextResponse.json({ success: true, lead });
 *   }
 * );
 *
 * export { createLeadHandler as POST };
 * ```
 */
export function withLimitEnforcement<T = unknown>(
  config: LimitEnforcementConfig,
  handler: (
    request: NextRequest,
    session: { user: { id: string; [key: string]: unknown } },
    enforcement: LimitEnforcementResult,
  ) => Promise<NextResponse<T>>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const enforcement = await enforceLimit(session.user.id, config);

    if (!enforcement.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: enforcement.message,
          limitExceeded: true,
          usage: enforcement.usage,
        },
        { status: 403 },
      );
    }

    return handler(request, session, enforcement);
  };
}

/**
 * Decorator-style limit check for use in any async function
 *
 * @example
 * ```typescript
 * async function createForm(userId: string, formData: FormData) {
 *   await requireLimit(userId, "forms");
 *   // If we get here, limit check passed
 *   return await FormModel.create(formData);
 * }
 * ```
 */
export async function requireLimit(
  userId: string,
  usageKey: string,
  amount: number = 1,
): Promise<void> {
  const result = await canPerformAction(userId, usageKey, amount);

  if (!result.allowed) {
    const error = new Error(result.message || "Usage limit exceeded");
    (error as Error & { code: string }).code = "LIMIT_EXCEEDED";
    (error as Error & { usage: LimitCheckResult }).usage = result;
    throw error;
  }
}

/**
 * Decorator-style feature check
 *
 * @example
 * ```typescript
 * async function analyzeCallWithAI(userId: string, callId: string) {
 *   await requireFeature(userId, "callAIAnalysis");
 *   // If we get here, feature is enabled
 *   return await performAIAnalysis(callId);
 * }
 * ```
 */
export async function requireFeature(
  userId: string,
  featureKey: keyof ISubscriptionLimits,
): Promise<void> {
  const result = await checkFeatureAccess(userId, featureKey);

  if (!result.allowed) {
    const error = new Error(result.message || "Feature not available");
    (error as Error & { code: string }).code = "FEATURE_NOT_AVAILABLE";
    (error as Error & { feature: FeatureAccessResult }).feature = result;
    throw error;
  }
}

/**
 * Combined check for feature access and usage limit
 *
 * @example
 * ```typescript
 * await requireFeatureAndLimit(userId, {
 *   featureKey: "chatbotEnabled",
 *   usageKey: "leads",
 *   amount: 1,
 * });
 * ```
 */
export async function requireFeatureAndLimit(
  userId: string,
  config: {
    featureKey: keyof ISubscriptionLimits;
    usageKey: string;
    amount?: number;
  },
): Promise<void> {
  await requireFeature(userId, config.featureKey);
  await requireLimit(userId, config.usageKey, config.amount);
}
