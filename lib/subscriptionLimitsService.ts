/**
 * Subscription Limits Service
 * Centralized service for checking and enforcing subscription limits
 * Includes concurrent session management, usage tracking, and notifications
 */

import { User } from "@/models";
import dbConnect from "@/lib/connectdb";
import { ISubscriptionLimits } from "@/models/types/subscription";
import { sendNotification } from "@/lib/notificationService";

// Session tracking interface
export interface ActiveSession {
  sessionId: string;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Limit check result
export interface LimitCheckResult {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  message?: string;
  percentage?: number;
  isWarning?: boolean;
  isSoftLimit?: boolean;
}

// Feature access result
export interface FeatureAccessResult {
  allowed: boolean;
  feature: string;
  message?: string;
}

// Usage increment result with notifications
export interface UsageIncrementResult {
  success: boolean;
  allowed: boolean;
  currentUsage: number;
  limit: number;
  percentage: number;
  notificationSent?: boolean;
  message?: string;
}

// Usage notification thresholds
export const USAGE_THRESHOLDS = {
  WARNING_80: 80,
  CRITICAL_90: 90,
  LIMIT_REACHED: 100,
} as const;

// Soft limits configuration - these limits warn but don't block
export const SOFT_LIMIT_KEYS: (keyof ISubscriptionLimits)[] = [
  "leads", // Leads can exceed, but notify
  "callSeconds", // Calls can exceed, but notify
];

// Hard limits configuration - these limits strictly block
export const HARD_LIMIT_KEYS: (keyof ISubscriptionLimits)[] = [
  "forms",
  "buyers",
  "smsCampaignsPerMonth",
  "invoicesPerMonth",
  "automationWorkflows",
  "teamMembers",
  "maxConcurrentSessions",
];

// Usage key to limit key mapping
export const USAGE_TO_LIMIT_MAP: Record<string, keyof ISubscriptionLimits> = {
  leads: "leads",
  callSeconds: "callSeconds",
  forms: "forms",
  buyers: "buyers",
  maxWebhooks: "maxWebhooks",
  smsCampaigns: "smsCampaignsPerMonth",
  smsCampaignsPerMonth: "smsCampaignsPerMonth",
  invoices: "invoicesPerMonth",
  invoicesPerMonth: "invoicesPerMonth",
  workflowExecutions: "automationWorkflows",
  automationWorkflows: "automationWorkflows",
  teamMembersCount: "teamMembers",
  activeSessions: "maxConcurrentSessions",
};

const USAGE_TO_TRACKING_MAP: Record<string, string> = {
  leads: "leads",
  callSeconds: "callSeconds",
  forms: "forms",
  buyers: "buyers",
  maxWebhooks: "maxWebhooks",
  smsCampaigns: "smsCampaigns",
  smsCampaignsPerMonth: "smsCampaigns",
  invoices: "invoices",
  invoicesPerMonth: "invoices",
  workflowExecutions: "workflowExecutions",
  automationWorkflows: "workflowExecutions",
  teamMembersCount: "teamMembersCount",
  activeSessions: "activeSessions",
};

function resolveUsageField(usageKey: string): string {
  if (usageKey === "maxWebhooks") {
    return usageKey;
  }
  return USAGE_TO_TRACKING_MAP[usageKey] || usageKey;
}

// Notification message templates
const NOTIFICATION_MESSAGES = {
  warning_80: (resource: string, used: number, limit: number) =>
    `You've used 80% of your ${resource} limit (${used}/${limit}). Consider upgrading your plan.`,
  critical_90: (resource: string, used: number, limit: number) =>
    `You've used 90% of your ${resource} limit (${used}/${limit}). Approaching maximum!`,
  limit_reached: (resource: string, used: number, limit: number) =>
    `You've reached your ${resource} limit (${used}/${limit}). Upgrade to continue.`,
  limit_exceeded: (resource: string, used: number, limit: number) =>
    `You've exceeded your ${resource} limit (${used}/${limit}). Please upgrade your plan.`,
};

// Resource display names for notifications
const RESOURCE_DISPLAY_NAMES: Record<string, string> = {
  leads: "leads",
  callSeconds: "call minutes",
  forms: "forms",
  buyers: "buyers",
  maxWebhooks: "webhooks",
  smsCampaigns: "SMS campaigns",
  smsCampaignsPerMonth: "SMS campaigns",
  invoices: "invoices",
  invoicesPerMonth: "invoices",
  workflowExecutions: "automation workflows",
  automationWorkflows: "automation workflows",
  teamMembersCount: "team members",
  activeSessions: "concurrent sessions",
};

/**
 * Check if a user has exceeded a numeric limit
 */
export async function checkNumericLimit(
  userId: string,
  limitKey: keyof ISubscriptionLimits,
  usageKey: string,
): Promise<LimitCheckResult> {
  await dbConnect();
  const user = await User.findById(userId);

  if (!user) {
    return {
      allowed: false,
      currentUsage: 0,
      limit: 0,
      message: "User not found",
    };
  }

  const limit =
    (user.subscription?.subscriptionLimits?.[limitKey] as number) ?? 0;
  const usageField = resolveUsageField(usageKey);
  const subscriptionUsage = user.subscription?.subscriptionUsage;
  const usage = subscriptionUsage
    ? ((subscriptionUsage as unknown as Record<string, number>)[usageField] ??
      0)
    : 0;

  // 0 means unlimited
  if (limit === 0) {
    return {
      allowed: true,
      currentUsage: usage,
      limit: 0,
      message: "Unlimited",
    };
  }

  const allowed = usage < limit;
  return {
    allowed,
    currentUsage: usage,
    limit,
    message: allowed
      ? undefined
      : `Limit reached: ${usage}/${limit} ${usageKey}`,
  };
}

/**
 * Check if a user has access to a boolean feature
 */
export async function checkFeatureAccess(
  userId: string,
  featureKey: keyof ISubscriptionLimits,
): Promise<FeatureAccessResult> {
  await dbConnect();
  const user = await User.findById(userId);

  if (!user) {
    return { allowed: false, feature: featureKey, message: "User not found" };
  }

  const allowed =
    (user.subscription?.subscriptionLimits?.[featureKey] as boolean) ?? false;
  return {
    allowed,
    feature: featureKey,
    message: allowed
      ? undefined
      : `Feature not available in your plan: ${featureKey}`,
  };
}

/**
 * Increment usage counter
 */
export async function incrementUsage(
  userId: string,
  usageField: string,
  amount: number = 1,
): Promise<boolean> {
  await dbConnect();

  const updatePath = `subscription.subscriptionUsage.${usageField}`;
  const result = await User.findByIdAndUpdate(userId, {
    $inc: { [updatePath]: amount },
  });

  return !!result;
}

/**
 * Check limit and increment usage atomically with notifications
 * This is the primary function to use for enforcing limits
 *
 * @param userId - The user ID
 * @param usageKey - The usage field key (e.g., "leads", "callSeconds")
 * @param amount - Amount to increment (default: 1)
 * @param options - Additional options
 * @returns UsageIncrementResult with enforcement decision and notifications
 */
export async function checkAndIncrementUsage(
  userId: string,
  usageKey: string,
  amount: number = 1,
  options: {
    sendNotifications?: boolean;
    enforceSoftLimit?: boolean; // If true, treat soft limits as hard limits
  } = {},
): Promise<UsageIncrementResult> {
  const { sendNotifications: notify = true, enforceSoftLimit = false } =
    options;

  await dbConnect();
  const user = await User.findById(userId);

  if (!user) {
    return {
      success: false,
      allowed: false,
      currentUsage: 0,
      limit: 0,
      percentage: 0,
      message: "User not found",
    };
  }

  const limitKey = USAGE_TO_LIMIT_MAP[usageKey];
  if (!limitKey) {
    return {
      success: false,
      allowed: false,
      currentUsage: 0,
      limit: 0,
      percentage: 0,
      message: `Unknown usage key: ${usageKey}`,
    };
  }

  const limit =
    (user.subscription?.subscriptionLimits?.[limitKey] as number) ?? 0;
  const usageField = resolveUsageField(usageKey);
  const subscriptionUsage = user.subscription?.subscriptionUsage;
  const currentUsage = subscriptionUsage
    ? ((subscriptionUsage as unknown as Record<string, number>)[usageField] ??
      0)
    : 0;

  // 0 means unlimited
  if (limit === 0) {
    // Increment usage (for tracking purposes)
    await incrementUsage(userId, usageField, amount);
    return {
      success: true,
      allowed: true,
      currentUsage: currentUsage + amount,
      limit: 0,
      percentage: 0,
      message: "Unlimited",
    };
  }

  const isSoftLimit = SOFT_LIMIT_KEYS.includes(limitKey) && !enforceSoftLimit;
  const newUsage = currentUsage + amount;
  const percentage = Math.round((newUsage / limit) * 100);
  const previousPercentage = Math.round((currentUsage / limit) * 100);

  // Determine if action is allowed
  let allowed: boolean;
  if (isSoftLimit) {
    // Soft limits allow exceeding but notify
    allowed = true;
  } else {
    // Hard limits block when reached
    allowed = currentUsage < limit;
  }

  // If not allowed (hard limit reached), return without incrementing
  if (!allowed) {
    // Send limit reached notification
    if (notify) {
      await sendUsageNotification(
        userId,
        usageKey,
        currentUsage,
        limit,
        "limit_reached",
      );
    }
    return {
      success: false,
      allowed: false,
      currentUsage,
      limit,
      percentage: Math.min(percentage, 100),
      message: `${RESOURCE_DISPLAY_NAMES[usageKey] || usageKey} limit reached (${currentUsage}/${limit})`,
    };
  }

  // Increment the usage
  const incrementResult = await incrementUsage(userId, usageField, amount);
  if (!incrementResult) {
    return {
      success: false,
      allowed: false,
      currentUsage,
      limit,
      percentage,
      message: "Failed to increment usage",
    };
  }

  // Check if we crossed a notification threshold
  let notificationSent = false;
  if (notify) {
    // Check if we crossed 80% threshold
    if (
      previousPercentage < USAGE_THRESHOLDS.WARNING_80 &&
      percentage >= USAGE_THRESHOLDS.WARNING_80 &&
      percentage < USAGE_THRESHOLDS.CRITICAL_90
    ) {
      await sendUsageNotification(
        userId,
        usageKey,
        newUsage,
        limit,
        "warning_80",
      );
      notificationSent = true;
    }
    // Check if we crossed 90% threshold
    else if (
      previousPercentage < USAGE_THRESHOLDS.CRITICAL_90 &&
      percentage >= USAGE_THRESHOLDS.CRITICAL_90 &&
      percentage < USAGE_THRESHOLDS.LIMIT_REACHED
    ) {
      await sendUsageNotification(
        userId,
        usageKey,
        newUsage,
        limit,
        "critical_90",
      );
      notificationSent = true;
    }
    // Check if we hit 100%
    else if (
      previousPercentage < USAGE_THRESHOLDS.LIMIT_REACHED &&
      percentage >= USAGE_THRESHOLDS.LIMIT_REACHED
    ) {
      await sendUsageNotification(
        userId,
        usageKey,
        newUsage,
        limit,
        "limit_reached",
      );
      notificationSent = true;
    }
    // For soft limits, notify when exceeding
    else if (isSoftLimit && newUsage > limit && currentUsage <= limit) {
      await sendUsageNotification(
        userId,
        usageKey,
        newUsage,
        limit,
        "limit_exceeded",
      );
      notificationSent = true;
    }
  }

  return {
    success: true,
    allowed: true,
    currentUsage: newUsage,
    limit,
    percentage: Math.min(percentage, 100),
    notificationSent,
    message:
      percentage >= 100
        ? `${RESOURCE_DISPLAY_NAMES[usageKey] || usageKey} limit reached`
        : undefined,
  };
}

/**
 * Send usage notification to user
 */
async function sendUsageNotification(
  userId: string,
  usageKey: string,
  currentUsage: number,
  limit: number,
  level: "warning_80" | "critical_90" | "limit_reached" | "limit_exceeded",
): Promise<void> {
  const resourceName = RESOURCE_DISPLAY_NAMES[usageKey] || usageKey;

  // For call seconds, convert to minutes for display
  let displayUsage = currentUsage;
  let displayLimit = limit;
  if (usageKey === "callSeconds") {
    displayUsage = Math.round(currentUsage / 60);
    displayLimit = Math.round(limit / 60);
  }

  const message = NOTIFICATION_MESSAGES[level](
    resourceName,
    displayUsage,
    displayLimit,
  );

  const typeMap = {
    warning_80: "info",
    critical_90: "alert",
    limit_reached: "alert",
    limit_exceeded: "alert",
  };

  const titleMap = {
    warning_80: `${resourceName} usage at 80%`,
    critical_90: `${resourceName} usage at 90%`,
    limit_reached: `${resourceName} limit reached`,
    limit_exceeded: `${resourceName} limit exceeded`,
  };

  try {
    await sendNotification({
      userId,
      type: typeMap[level],
      title: titleMap[level],
      message,
      metadata: {
        category: "usage_limit",
        usageKey,
        currentUsage,
        limit,
        level,
      },
    });
  } catch (error) {
    console.error("[UsageNotification] Failed to send notification:", error);
  }
}

/**
 * Check if user is approaching a limit (useful for UI warnings)
 */
export async function getUsageWarnings(userId: string): Promise<
  {
    usageKey: string;
    percentage: number;
    level: "warning" | "critical" | "exceeded";
    message: string;
  }[]
> {
  await dbConnect();
  const user = await User.findById(userId);

  if (!user) {
    return [];
  }

  const warnings: {
    usageKey: string;
    percentage: number;
    level: "warning" | "critical" | "exceeded";
    message: string;
  }[] = [];
  const processedUsageFields = new Set<string>();

  const limits = user.subscription?.subscriptionLimits;
  const usage = user.subscription?.subscriptionUsage;

  if (!limits || !usage) {
    return [];
  }

  for (const [usageKey, limitKey] of Object.entries(USAGE_TO_LIMIT_MAP)) {
    const usageField = resolveUsageField(usageKey);
    if (processedUsageFields.has(usageField)) {
      continue;
    }
    processedUsageFields.add(usageField);

    const limit = (limits as unknown as Record<string, number>)[limitKey] ?? 0;
    if (limit === 0) continue; // Skip unlimited

    const currentUsage =
      (usage as unknown as Record<string, number>)[usageField] ?? 0;
    const percentage = Math.round((currentUsage / limit) * 100);

    if (percentage >= 100) {
      warnings.push({
        usageKey,
        percentage,
        level: "exceeded",
        message: `${RESOURCE_DISPLAY_NAMES[usageKey] || usageKey} limit exceeded`,
      });
    } else if (percentage >= 90) {
      warnings.push({
        usageKey,
        percentage,
        level: "critical",
        message: `${RESOURCE_DISPLAY_NAMES[usageKey] || usageKey} at ${percentage}%`,
      });
    } else if (percentage >= 80) {
      warnings.push({
        usageKey,
        percentage,
        level: "warning",
        message: `${RESOURCE_DISPLAY_NAMES[usageKey] || usageKey} at ${percentage}%`,
      });
    }
  }

  return warnings.sort((a, b) => b.percentage - a.percentage);
}

/**
 * Check if user can perform an action (without incrementing)
 * Use this for pre-flight checks before expensive operations
 */
export async function canPerformAction(
  userId: string,
  usageKey: string,
  amount: number = 1,
): Promise<LimitCheckResult> {
  await dbConnect();
  const user = await User.findById(userId);

  if (!user) {
    return {
      allowed: false,
      currentUsage: 0,
      limit: 0,
      message: "User not found",
    };
  }

  const limitKey = USAGE_TO_LIMIT_MAP[usageKey];
  if (!limitKey) {
    return {
      allowed: false,
      currentUsage: 0,
      limit: 0,
      message: `Unknown usage key: ${usageKey}`,
    };
  }

  const limit =
    (user.subscription?.subscriptionLimits?.[limitKey] as number) ?? 0;
  const usageField = resolveUsageField(usageKey);
  const subscriptionUsage = user.subscription?.subscriptionUsage;
  const currentUsage = subscriptionUsage
    ? ((subscriptionUsage as unknown as Record<string, number>)[usageField] ??
      0)
    : 0;

  // 0 means unlimited
  if (limit === 0) {
    return {
      allowed: true,
      currentUsage,
      limit: 0,
      message: "Unlimited",
    };
  }

  const isSoftLimit = SOFT_LIMIT_KEYS.includes(limitKey);
  const wouldExceed = currentUsage + amount > limit;
  const percentage = Math.round(((currentUsage + amount) / limit) * 100);

  // Soft limits allow action but with warning
  if (isSoftLimit) {
    return {
      allowed: true,
      currentUsage,
      limit,
      percentage,
      isSoftLimit: true,
      isWarning: wouldExceed,
      message: wouldExceed
        ? `This will exceed your ${RESOURCE_DISPLAY_NAMES[usageKey] || usageKey} limit`
        : undefined,
    };
  }

  // Hard limits block
  const allowed = currentUsage + amount <= limit;
  return {
    allowed,
    currentUsage,
    limit,
    percentage,
    isSoftLimit: false,
    isWarning: percentage >= 80 && percentage < 100,
    message: allowed
      ? undefined
      : `${RESOURCE_DISPLAY_NAMES[usageKey] || usageKey} limit would be exceeded (${currentUsage + amount}/${limit})`,
  };
}

/**
 * Reset monthly usage counters
 * Should be called at the start of each billing period
 */
export async function resetMonthlyUsage(userId: string): Promise<boolean> {
  await dbConnect();

  const result = await User.findByIdAndUpdate(userId, {
    $set: {
      "subscription.subscriptionUsage.leads": 0,
      "subscription.subscriptionUsage.callSeconds": 0,
      "subscription.subscriptionUsage.smsCampaigns": 0,
      "subscription.subscriptionUsage.workflowExecutions": 0,
      "subscription.subscriptionUsage.invoices": 0,
      "subscription.subscriptionUsage.usagePeriodStart": new Date(),
    },
  });

  return !!result;
}

/**
 * Check concurrent session limit
 */
export async function checkConcurrentSessionLimit(
  userId: string,
): Promise<LimitCheckResult> {
  await dbConnect();
  const user = await User.findById(userId);

  if (!user) {
    return {
      allowed: false,
      currentUsage: 0,
      limit: 0,
      message: "User not found",
    };
  }

  const limit =
    user.subscription?.subscriptionLimits?.maxConcurrentSessions ?? 1;
  const currentSessions =
    user.subscription?.subscriptionUsage?.activeSessions ?? 0;

  // 0 means unlimited
  if (limit === 0) {
    return {
      allowed: true,
      currentUsage: currentSessions,
      limit: 0,
      message: "Unlimited sessions",
    };
  }

  const allowed = currentSessions < limit;
  return {
    allowed,
    currentUsage: currentSessions,
    limit,
    message: allowed
      ? undefined
      : `Maximum concurrent sessions reached: ${currentSessions}/${limit}. Please sign out from another device.`,
  };
}

/**
 * Register a new session for a user
 */
export async function registerSession(userId: string): Promise<boolean> {
  await dbConnect();

  const result = await User.findByIdAndUpdate(userId, {
    $inc: { "subscription.subscriptionUsage.activeSessions": 1 },
  });

  return !!result;
}

/**
 * Remove a session for a user
 */
export async function removeSession(userId: string): Promise<boolean> {
  await dbConnect();

  const result = await User.findByIdAndUpdate(
    userId,
    {
      $inc: { "subscription.subscriptionUsage.activeSessions": -1 },
    },
    { new: true },
  );

  // Ensure we don't go below 0
  if (
    result &&
    (result.subscription?.subscriptionUsage?.activeSessions ?? 0) < 0
  ) {
    await User.findByIdAndUpdate(userId, {
      $set: { "subscription.subscriptionUsage.activeSessions": 0 },
    });
  }

  return !!result;
}

/**
 * Get all subscription limits for a user
 */
export async function getSubscriptionLimits(
  userId: string,
): Promise<ISubscriptionLimits | null> {
  await dbConnect();
  const user = await User.findById(userId);

  if (!user) {
    return null;
  }

  return user.subscription?.subscriptionLimits ?? null;
}

/**
 * Get subscription usage summary
 */
export async function getUsageSummary(userId: string): Promise<{
  limits: ISubscriptionLimits | null;
  usage: Record<string, number | Date>;
  percentages: Record<string, number>;
}> {
  await dbConnect();
  const user = await User.findById(userId);

  if (!user) {
    return { limits: null, usage: {}, percentages: {} };
  }

  const limits = user.subscription?.subscriptionLimits;
  const usage = user.subscription?.subscriptionUsage ?? {};

  // Calculate usage percentages for numeric limits
  const percentages: Record<string, number> = {};

  if (limits) {
    const numericLimitKeys: (keyof ISubscriptionLimits)[] = [
      "leads",
      "callSeconds",
      "forms",
      "buyers",
      "smsCampaignsPerMonth",
      "invoicesPerMonth",
      "automationWorkflows",
      "teamMembers",
      "maxConcurrentSessions",
    ];

    const usageMap: Record<string, string> = {
      leads: "leads",
      callSeconds: "callSeconds",
      forms: "forms",
      buyers: "buyers",
      smsCampaignsPerMonth: "smsCampaigns",
      invoicesPerMonth: "invoices",
      automationWorkflows: "workflowExecutions",
      teamMembers: "teamMembersCount",
      maxConcurrentSessions: "activeSessions",
    };

    for (const key of numericLimitKeys) {
      const limit = limits[key] as number;
      const usageKey = usageMap[key];
      const currentUsage = (usage as Record<string, number>)[usageKey] ?? 0;

      if (limit > 0) {
        percentages[key] = Math.round((currentUsage / limit) * 100);
      } else {
        percentages[key] = 0; // Unlimited
      }
    }
  }

  return {
    limits: limits ?? null,
    usage: usage as Record<string, number | Date>,
    percentages,
  };
}

/**
 * Pre-defined tier limit configurations
 * These can be used as templates when creating tiers
 */
export const TIER_LIMIT_PRESETS = {
  free: {
    // Core Limits
    forms: 1,
    leads: 50,
    buyers: 3,
    industries: 1,

    // Call Tracking & Telephony
    numbers: 1,
    twilioNumbers: 0,
    callSeconds: 500,
    callRecording: false,
    callTranscription: false,
    callAIAnalysis: false,
    multiRingForwarding: false,
    geoRouting: false,
    scheduledCallbacks: false,
    concurrentCallLimit: 1,

    // Marketing & Campaigns
    emailCampaignsEnabled: true,
    smsCampaignsEnabled: true,
    smsCampaignsPerMonth: 0,
    smsRecipientsPerCampaign: 0,
    smsPhoneNumbers: 0,

    // Automation & Workflows
    automationWorkflows: 1,
    automationActionsPerWorkflow: 2,

    // AI & Advanced Features
    chatbotEnabled: false,
    leadScoringEnabled: false,
    sentimentAnalysisEnabled: false,
    aiSummariesEnabled: false,
    aiGenerativeEnabled: true,

    // Invoicing & Payments
    invoicesPerMonth: 5,
    customInvoiceBranding: false,

    // Integrations
    zapierIntegration: false,
    webhookIntegration: false,
    apiAccess: false,
    maxWebhooks: 0,

    // Marketplace & Distribution
    marketplaceAccess: false,
    exclusiveLeads: false,
    leadDistributionRules: false,

    // Data & Reporting
    exports: false,
    imports: false,
    advancedReports: false,
    dataRetentionDays: 30,

    // Team & Access
    teamMembers: 1,
    maxConcurrentSessions: 1,

    // Support
    liveSupport: false,
    prioritySupport: false,

    // Customization
    customBranding: false,
    customDomain: false,
  },

  starter: {
    // Core Limits
    forms: 3,
    leads: 250,
    buyers: 10,
    industries: 2,

    // Call Tracking & Telephony
    numbers: 3,
    twilioNumbers: 1,
    callSeconds: 2000,
    callRecording: true,
    callTranscription: false,
    callAIAnalysis: false,
    multiRingForwarding: false,
    geoRouting: false,
    scheduledCallbacks: true,
    concurrentCallLimit: 2,

    // Marketing & Campaigns
    emailCampaignsEnabled: true,
    smsCampaignsEnabled: true,
    smsCampaignsPerMonth: 5,
    smsRecipientsPerCampaign: 100,
    smsPhoneNumbers: 1,

    // Automation & Workflows
    automationWorkflows: 3,
    automationActionsPerWorkflow: 5,

    // AI & Advanced Features
    chatbotEnabled: false,
    leadScoringEnabled: true,
    sentimentAnalysisEnabled: false,
    aiSummariesEnabled: false,
    aiGenerativeEnabled: true,

    // Invoicing & Payments
    invoicesPerMonth: 25,
    customInvoiceBranding: false,

    // Integrations
    zapierIntegration: true,
    webhookIntegration: true,
    apiAccess: false,
    maxWebhooks: 2,

    // Marketplace & Distribution
    marketplaceAccess: true,
    exclusiveLeads: false,
    leadDistributionRules: false,

    // Data & Reporting
    exports: true,
    imports: false,
    advancedReports: false,
    dataRetentionDays: 90,

    // Team & Access
    teamMembers: 2,
    maxConcurrentSessions: 2,

    // Support
    liveSupport: false,
    prioritySupport: false,

    // Customization
    customBranding: false,
    customDomain: false,
  },

  professional: {
    // Core Limits
    forms: 10,
    leads: 1000,
    buyers: 50,
    industries: 5,

    // Call Tracking & Telephony
    numbers: 10,
    twilioNumbers: 5,
    callSeconds: 10000,
    callRecording: true,
    callTranscription: true,
    callAIAnalysis: true,
    multiRingForwarding: true,
    geoRouting: true,
    scheduledCallbacks: true,
    concurrentCallLimit: 5,

    // Marketing & Campaigns
    emailCampaignsEnabled: true,
    smsCampaignsEnabled: true,
    smsCampaignsPerMonth: 25,
    smsRecipientsPerCampaign: 500,
    smsPhoneNumbers: 5,

    // Automation & Workflows
    automationWorkflows: 10,
    automationActionsPerWorkflow: 10,

    // AI & Advanced Features
    chatbotEnabled: true,
    leadScoringEnabled: true,
    sentimentAnalysisEnabled: true,
    aiSummariesEnabled: true,
    aiGenerativeEnabled: true,

    // Invoicing & Payments
    invoicesPerMonth: 100,
    customInvoiceBranding: true,

    // Integrations
    zapierIntegration: true,
    webhookIntegration: true,
    apiAccess: true,
    maxWebhooks: 10,

    // Marketplace & Distribution
    marketplaceAccess: true,
    exclusiveLeads: true,
    leadDistributionRules: true,

    // Data & Reporting
    exports: true,
    imports: true,
    advancedReports: true,
    dataRetentionDays: 365,

    // Team & Access
    teamMembers: 5,
    maxConcurrentSessions: 3,

    // Support
    liveSupport: true,
    prioritySupport: false,

    // Customization
    customBranding: true,
    customDomain: false,
  },

  enterprise: {
    // Core Limits (0 = unlimited)
    forms: 0,
    leads: 0,
    buyers: 0,
    industries: 0,

    // Call Tracking & Telephony
    numbers: 0,
    twilioNumbers: 0,
    callSeconds: 0,
    callRecording: true,
    callTranscription: true,
    callAIAnalysis: true,
    multiRingForwarding: true,
    geoRouting: true,
    scheduledCallbacks: true,
    concurrentCallLimit: 0,

    // Marketing & Campaigns
    emailCampaignsEnabled: true,
    smsCampaignsEnabled: true,
    smsCampaignsPerMonth: 0,
    smsRecipientsPerCampaign: 0,
    smsPhoneNumbers: 0,

    // Automation & Workflows
    automationWorkflows: 0,
    automationActionsPerWorkflow: 0,

    // AI & Advanced Features
    chatbotEnabled: true,
    leadScoringEnabled: true,
    sentimentAnalysisEnabled: true,
    aiSummariesEnabled: true,
    aiGenerativeEnabled: true,

    // Invoicing & Payments
    invoicesPerMonth: 0,
    customInvoiceBranding: true,

    // Integrations
    zapierIntegration: true,
    webhookIntegration: true,
    apiAccess: true,
    maxWebhooks: 0,

    // Marketplace & Distribution
    marketplaceAccess: true,
    exclusiveLeads: true,
    leadDistributionRules: true,

    // Data & Reporting
    exports: true,
    imports: true,
    advancedReports: true,
    dataRetentionDays: 0, // Unlimited

    // Team & Access
    teamMembers: 0,
    maxConcurrentSessions: 0,

    // Support
    liveSupport: true,
    prioritySupport: true,

    // Customization
    customBranding: true,
    customDomain: true,
  },
};

export type TierPresetName = keyof typeof TIER_LIMIT_PRESETS;

/**
 * Build subscription limits from tier limits
 * This ensures all limit fields are properly set with fallback defaults
 * Use this when activating/updating subscriptions to maintain consistency
 */
export function buildSubscriptionLimitsFromTier(
  tierLimits: Partial<ISubscriptionLimits> | null | undefined,
): ISubscriptionLimits {
  return {
    // Core Limits
    forms: tierLimits?.forms ?? 1,
    leads: tierLimits?.leads ?? 100,
    buyers: tierLimits?.buyers ?? 5,
    industries: tierLimits?.industries ?? 1,

    // Call Tracking & Telephony
    numbers: tierLimits?.numbers ?? 1,
    twilioNumbers: tierLimits?.twilioNumbers ?? 0,
    callSeconds: tierLimits?.callSeconds ?? 1000,
    callRecording: tierLimits?.callRecording ?? false,
    callTranscription: tierLimits?.callTranscription ?? false,
    callAIAnalysis: tierLimits?.callAIAnalysis ?? false,
    multiRingForwarding: tierLimits?.multiRingForwarding ?? false,
    geoRouting: tierLimits?.geoRouting ?? false,
    scheduledCallbacks: tierLimits?.scheduledCallbacks ?? false,
    concurrentCallLimit: tierLimits?.concurrentCallLimit ?? 1,

    // Marketing & Campaigns
    emailCampaignsEnabled: tierLimits?.emailCampaignsEnabled ?? true,
    smsCampaignsEnabled: tierLimits?.smsCampaignsEnabled ?? true,
    smsCampaignsPerMonth: tierLimits?.smsCampaignsPerMonth ?? 0,
    smsRecipientsPerCampaign: tierLimits?.smsRecipientsPerCampaign ?? 50,
    smsPhoneNumbers: tierLimits?.smsPhoneNumbers ?? 0,

    // Automation & Workflows
    automationWorkflows: tierLimits?.automationWorkflows ?? 0,
    automationActionsPerWorkflow: tierLimits?.automationActionsPerWorkflow ?? 3,

    // AI & Advanced Features
    chatbotEnabled: tierLimits?.chatbotEnabled ?? false,
    leadScoringEnabled: tierLimits?.leadScoringEnabled ?? false,
    sentimentAnalysisEnabled: tierLimits?.sentimentAnalysisEnabled ?? false,
    aiSummariesEnabled: tierLimits?.aiSummariesEnabled ?? false,
    aiGenerativeEnabled: tierLimits?.aiGenerativeEnabled ?? true,

    // Invoicing & Payments
    invoicesPerMonth: tierLimits?.invoicesPerMonth ?? 10,
    customInvoiceBranding: tierLimits?.customInvoiceBranding ?? false,

    // Integrations
    zapierIntegration: tierLimits?.zapierIntegration ?? false,
    webhookIntegration: tierLimits?.webhookIntegration ?? false,
    apiAccess: tierLimits?.apiAccess ?? false,
    maxWebhooks: tierLimits?.maxWebhooks ?? 0,

    // Marketplace & Distribution
    marketplaceAccess: tierLimits?.marketplaceAccess ?? false,
    exclusiveLeads: tierLimits?.exclusiveLeads ?? false,
    leadDistributionRules: tierLimits?.leadDistributionRules ?? false,

    // Data & Reporting
    exports: tierLimits?.exports ?? false,
    imports: tierLimits?.imports ?? false,
    advancedReports: tierLimits?.advancedReports ?? false,
    dataRetentionDays: tierLimits?.dataRetentionDays ?? 90,

    // Team & Access
    teamMembers: tierLimits?.teamMembers ?? 1,
    maxConcurrentSessions: tierLimits?.maxConcurrentSessions ?? 1,

    // Support
    liveSupport: tierLimits?.liveSupport ?? false,
    prioritySupport: tierLimits?.prioritySupport ?? false,

    // Customization
    customBranding: tierLimits?.customBranding ?? false,
    customDomain: tierLimits?.customDomain ?? false,
  };
}

/**
 * Build default subscription usage for a new billing period
 */
export function buildDefaultSubscriptionUsage(
  startDate: Date = new Date(),
  endDate?: Date,
) {
  const usagePeriodEnd =
    endDate || new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

  return {
    leads: 0,
    callSeconds: 0,
    forms: 0,
    buyers: 0,
    emailCampaigns: 0,
    smsCampaigns: 0,
    workflowExecutions: 0,
    invoices: 0,
    activeSessions: 0,
    teamMembersCount: 0,
    usagePeriodStart: startDate,
    usagePeriodEnd,
  };
}
