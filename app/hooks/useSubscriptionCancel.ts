"use client";

import { useCallback, useState } from "react";

/**
 * Cancellation reasons for subscription cancellation feedback
 */
export const CANCELLATION_REASONS = [
  "too_expensive",
  "not_using_enough",
  "missing_features",
  "switching_competitor",
  "technical_issues",
  "poor_support",
  "business_closed",
  "temporary_pause",
  "other",
] as const;

export type CancellationReason = (typeof CANCELLATION_REASONS)[number];

/**
 * Reason labels for UI display
 */
export const CANCELLATION_REASON_LABELS: Record<CancellationReason, string> = {
  too_expensive: "Too expensive",
  not_using_enough: "Not using it enough",
  missing_features: "Missing features I need",
  switching_competitor: "Switching to a competitor",
  technical_issues: "Technical issues",
  poor_support: "Poor customer support",
  business_closed: "Business closed",
  temporary_pause: "Taking a temporary break",
  other: "Other reason",
};

interface CancellationStatus {
  hasActiveSubscription: boolean;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  accessEndsAt?: string;
  canCancel: boolean;
  canReactivate: boolean;
  stripeDetails?: {
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  };
}

interface CancelResult {
  success: boolean;
  message?: string;
  accessEndsAt?: string;
  feedbackRecorded?: boolean;
  error?: string;
}

interface ReactivateResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Hook for managing subscription cancellation
 *
 * @example
 * ```tsx
 * const {
 *   cancelSubscription,
 *   reactivateSubscription,
 *   getCancellationStatus,
 *   isLoading,
 *   error,
 * } = useSubscriptionCancel();
 *
 * // Cancel at end of billing period with feedback
 * const handleCancel = async () => {
 *   const result = await cancelSubscription({
 *     cancelAt: "period_end",
 *     reason: "too_expensive",
 *     feedbackText: "The price increased too much",
 *   });
 *   if (result.success) {
 *     // Show success message with access end date
 *   }
 * };
 * ```
 */
export function useSubscriptionCancel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<CancellationStatus | null>(null);

  /**
   * Get current cancellation status
   */
  const getCancellationStatus =
    useCallback(async (): Promise<CancellationStatus | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/subscriptions/cancel", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();

        if (!data.success) {
          setError(data.message || "Failed to get cancellation status");
          return null;
        }

        setStatus(data.cancellationStatus);
        return data.cancellationStatus;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to get status";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    }, []);

  /**
   * Cancel the subscription
   */
  const cancelSubscription = useCallback(
    async (options: {
      cancelAt?: "now" | "period_end";
      reason?: CancellationReason;
      feedbackText?: string;
    }): Promise<CancelResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/subscriptions/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options),
        });

        const data = await response.json();

        if (!data.success) {
          const errorMsg = data.message || "Failed to cancel subscription";
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }

        // Refresh status after cancellation
        await getCancellationStatus();

        return {
          success: true,
          message: data.message,
          accessEndsAt: data.accessEndsAt,
          feedbackRecorded: data.feedbackRecorded,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to cancel";
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    [getCancellationStatus],
  );

  /**
   * Reactivate a subscription scheduled to cancel
   */
  const reactivateSubscription =
    useCallback(async (): Promise<ReactivateResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/subscriptions/cancel", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();

        if (!data.success) {
          const errorMsg = data.message || "Failed to reactivate subscription";
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }

        // Refresh status after reactivation
        await getCancellationStatus();

        return {
          success: true,
          message: data.message,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to reactivate";
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    }, [getCancellationStatus]);

  return {
    cancelSubscription,
    reactivateSubscription,
    getCancellationStatus,
    status,
    isLoading,
    error,
    clearError: () => setError(null),
    // Expose reason options for UI
    reasons: CANCELLATION_REASONS,
    reasonLabels: CANCELLATION_REASON_LABELS,
  };
}
