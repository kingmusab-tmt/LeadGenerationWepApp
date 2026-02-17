"use client";

import { useCallback, useState } from "react";

interface SessionRefreshResult {
  success: boolean;
  session?: {
    id: string;
    email: string;
    role: string;
    isSubActive: boolean;
    subscriptionPlan?: string;
    subscriptionExpiryDate?: string;
  };
  error?: string;
}

/**
 * Hook for refreshing user session after subscription changes
 * Use this after returning from Stripe checkout or after any subscription modification
 *
 * @example
 * ```tsx
 * const { refreshSession, isRefreshing } = useSessionRefresh();
 *
 * // After Stripe checkout redirect
 * useEffect(() => {
 *   if (searchParams.get('success') === 'true') {
 *     refreshSession().then(() => {
 *       // Session is now up-to-date
 *       router.push('/dashboard');
 *     });
 *   }
 * }, []);
 * ```
 */
export function useSessionRefresh(
  csrfFetch?: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>,
) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fallback to regular fetch if csrfFetch not provided
  const fetchFn = csrfFetch || fetch;

  const refreshSession =
    useCallback(async (): Promise<SessionRefreshResult> => {
      setIsRefreshing(true);
      setError(null);

      try {
        const response = await fetchFn("/api/auth/refresh-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();

        if (!data.success) {
          setError(data.message || "Failed to refresh session");
          return { success: false, error: data.message };
        }

        return { success: true, session: data.session };
      } catch (err: any) {
        const errorMessage = err.message || "Failed to refresh session";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsRefreshing(false);
      }
    }, [fetchFn]);

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/refresh-session");
      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Failed to check session:", err);
      return { success: false, cached: false };
    }
  }, []);

  return {
    refreshSession,
    checkSession,
    isRefreshing,
    error,
    clearError: () => setError(null),
  };
}

export default useSessionRefresh;
