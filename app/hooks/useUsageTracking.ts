"use client";

import { useCallback, useState, useEffect } from "react";

interface UsageLimits {
  leads?: number;
  callSeconds?: number;
  forms?: number;
  buyers?: number;
  emailCampaignsPerMonth?: number;
  smsCampaignsPerMonth?: number;
  invoicesPerMonth?: number;
  [key: string]: number | boolean | undefined;
}

interface UsageData {
  leads?: number;
  callSeconds?: number;
  forms?: number;
  buyers?: number;
  emailCampaigns?: number;
  smsCampaigns?: number;
  invoices?: number;
  [key: string]: number | Date | undefined;
}

interface UsageWarning {
  usageKey: string;
  percentage: number;
  level: "warning" | "critical" | "exceeded";
  message: string;
}

interface UsageSummary {
  usage: UsageData;
  limits: UsageLimits;
  percentages: Record<string, number>;
  warnings: UsageWarning[];
}

interface CheckResult {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  percentage?: number;
  isWarning?: boolean;
  isSoftLimit?: boolean;
  message?: string;
}

interface IncrementResult extends CheckResult {
  success: boolean;
  notificationSent?: boolean;
}

/**
 * Hook for tracking and enforcing subscription usage limits
 *
 * @example
 * ```tsx
 * const { usage, warnings, checkLimit, incrementUsage, isLoading } = useUsageTracking();
 *
 * // Check if user can create a new lead
 * const handleCreateLead = async () => {
 *   const check = await checkLimit("leads");
 *   if (!check.allowed) {
 *     showUpgradeModal(check.message);
 *     return;
 *   }
 *   // Proceed with creating lead
 *   const result = await createLead(leadData);
 *   // Increment usage after successful creation
 *   await incrementUsage("leads");
 * };
 *
 * // Show warnings in UI
 * {warnings.map(w => (
 *   <Alert severity={w.level === "exceeded" ? "error" : "warning"}>
 *     {w.message}
 *   </Alert>
 * ))}
 * ```
 */
export function useUsageTracking() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [limits, setLimits] = useState<UsageLimits | null>(null);
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  const [warnings, setWarnings] = useState<UsageWarning[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch current usage summary and warnings
   */
  const fetchUsage = useCallback(
    async (includeWarnings: boolean = true): Promise<UsageSummary | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/subscriptions/usage?includeWarnings=${includeWarnings}`,
        );
        const data = await response.json();

        if (data.success) {
          setUsage(data.usage);
          setLimits(data.limits);
          setPercentages(data.percentages);
          setWarnings(data.warnings || []);
          return {
            usage: data.usage,
            limits: data.limits,
            percentages: data.percentages,
            warnings: data.warnings || [],
          };
        } else {
          setError(data.message || "Failed to fetch usage");
          return null;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  /**
   * Check if an action is allowed (pre-flight check)
   */
  const checkLimit = useCallback(
    async (usageKey: string, amount: number = 1): Promise<CheckResult> => {
      try {
        const response = await fetch("/api/subscriptions/usage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "check",
            usageKey,
            amount,
          }),
        });

        const data = await response.json();

        return {
          allowed: data.allowed ?? false,
          currentUsage: data.currentUsage ?? 0,
          limit: data.limit ?? 0,
          percentage: data.percentage,
          isWarning: data.isWarning,
          isSoftLimit: data.isSoftLimit,
          message: data.message,
        };
      } catch (err) {
        return {
          allowed: false,
          currentUsage: 0,
          limit: 0,
          message: err instanceof Error ? err.message : "Check failed",
        };
      }
    },
    [],
  );

  /**
   * Check limit and increment usage (use after successful action)
   */
  const incrementUsage = useCallback(
    async (
      usageKey: string,
      amount: number = 1,
      enforceSoftLimit: boolean = false,
    ): Promise<IncrementResult> => {
      try {
        const response = await fetch("/api/subscriptions/usage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "increment",
            usageKey,
            amount,
            enforceSoftLimit,
          }),
        });

        const data = await response.json();

        // Refresh local state after increment
        if (data.success) {
          fetchUsage(true);
        }

        return {
          success: data.success ?? false,
          allowed: data.allowed ?? false,
          currentUsage: data.currentUsage ?? 0,
          limit: data.limit ?? 0,
          percentage: data.percentage,
          notificationSent: data.notificationSent,
          message: data.message,
        };
      } catch (err) {
        return {
          success: false,
          allowed: false,
          currentUsage: 0,
          limit: 0,
          message: err instanceof Error ? err.message : "Increment failed",
        };
      }
    },
    [fetchUsage],
  );

  /**
   * Get percentage for a specific usage key
   */
  const getPercentage = useCallback(
    (usageKey: string): number => {
      return percentages[usageKey] ?? 0;
    },
    [percentages],
  );

  /**
   * Check if a specific resource is at or near limit
   */
  const isAtLimit = useCallback(
    (usageKey: string): boolean => {
      return (percentages[usageKey] ?? 0) >= 100;
    },
    [percentages],
  );

  /**
   * Check if a specific resource is approaching limit (80%+)
   */
  const isApproachingLimit = useCallback(
    (usageKey: string): boolean => {
      const pct = percentages[usageKey] ?? 0;
      return pct >= 80 && pct < 100;
    },
    [percentages],
  );

  /**
   * Get warning level for a specific usage key
   */
  const getWarningLevel = useCallback(
    (usageKey: string): "none" | "warning" | "critical" | "exceeded" => {
      const warning = warnings.find((w) => w.usageKey === usageKey);
      return warning?.level ?? "none";
    },
    [warnings],
  );

  // Fetch usage on mount
  useEffect(() => {
    fetchUsage(true);
  }, [fetchUsage]);

  return {
    // Data
    usage,
    limits,
    percentages,
    warnings,
    isLoading,
    error,

    // Actions
    fetchUsage,
    checkLimit,
    incrementUsage,

    // Helpers
    getPercentage,
    isAtLimit,
    isApproachingLimit,
    getWarningLevel,
  };
}

/**
 * Usage keys for type safety
 */
export const USAGE_KEYS = {
  LEADS: "leads",
  CALL_SECONDS: "callSeconds",
  FORMS: "forms",
  BUYERS: "buyers",
  EMAIL_CAMPAIGNS: "emailCampaigns",
  SMS_CAMPAIGNS: "smsCampaigns",
  INVOICES: "invoices",
  WORKFLOW_EXECUTIONS: "workflowExecutions",
  TEAM_MEMBERS: "teamMembersCount",
  ACTIVE_SESSIONS: "activeSessions",
} as const;

export type UsageKey = (typeof USAGE_KEYS)[keyof typeof USAGE_KEYS];
