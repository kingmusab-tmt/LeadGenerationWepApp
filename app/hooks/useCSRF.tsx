"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";

/**
 * CSRF Token Context
 *
 * Provides CSRF token to all components in the app.
 * Only fetches a token when the user is authenticated,
 * avoiding unnecessary API calls on public pages.
 */

interface CSRFContextType {
  csrfToken: string | null;
  loading: boolean;
  refreshToken: () => Promise<string | null>;
  ensureToken: () => Promise<string | null>;
}

const CSRFContext = createContext<CSRFContextType>({
  csrfToken: null,
  loading: false,
  refreshToken: async () => null,
  ensureToken: async () => null,
});

export function CSRFProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchingRef = useRef(false);

  const fetchToken = useCallback(async (): Promise<string | null> => {
    if (fetchingRef.current) return csrfToken;
    fetchingRef.current = true;
    try {
      const response = await fetch("/api/csrf-token", {
        credentials: "include",
      });

      if (response.status === 401) {
        setLoading(false);
        return null;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch CSRF token");
      }

      const data = await response.json();
      setCsrfToken(data.csrfToken);
      return data.csrfToken as string;
    } catch (error) {
      console.error("[CSRF] Failed to fetch token:", error);
      setCsrfToken(null);
      return null;
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [csrfToken]);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    setLoading(true);
    try {
      const response = await fetch("/api/csrf-token", {
        method: "POST",
        credentials: "include",
      });

      if (response.status === 401) {
        setLoading(false);
        setCsrfToken(null);
        return null;
      }

      if (!response.ok) {
        throw new Error("Failed to refresh CSRF token");
      }

      const data = await response.json();
      setCsrfToken(data.csrfToken);
      return data.csrfToken as string;
    } catch (error) {
      console.error("[CSRF] Failed to refresh token:", error);
      return await fetchToken();
    } finally {
      setLoading(false);
    }
  }, [fetchToken]);

  const ensureToken = useCallback(async (): Promise<string | null> => {
    if (csrfToken) return csrfToken;
    return await fetchToken();
  }, [csrfToken, fetchToken]);

  // Only fetch token when the user is authenticated
  useEffect(() => {
    if (status === "authenticated") {
      setLoading(true);
      fetchToken();
    } else if (status === "unauthenticated") {
      setCsrfToken(null);
      setLoading(false);
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh token every 50 minutes (before 1 hour expiry)
  useEffect(() => {
    if (!csrfToken) return;

    const interval = setInterval(
      () => {
        refreshToken();
      },
      50 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [csrfToken, refreshToken]);

  return (
    <CSRFContext.Provider
      value={{ csrfToken, loading, refreshToken, ensureToken }}
    >
      {children}
    </CSRFContext.Provider>
  );
}

/**
 * Hook to access CSRF token
 *
 * @example
 * const { csrfToken } = useCSRF();
 *
 * fetch('/api/update-profile', {
 *   method: 'POST',
 *   headers: {
 *     'X-CSRF-Token': csrfToken,
 *   },
 *   body: JSON.stringify(data),
 * });
 */
export function useCSRF() {
  const context = useContext(CSRFContext);

  if (!context) {
    throw new Error("useCSRF must be used within CSRFProvider");
  }

  return context;
}

/**
 * HOC to inject CSRF token into fetch requests
 *
 * @example
 * const fetchWithCSRF = useCSRFFetch();
 *
 * await fetchWithCSRF('/api/update-profile', {
 *   method: 'POST',
 *   body: JSON.stringify(data),
 * });
 */
export function useCSRFFetch() {
  const { csrfToken, ensureToken } = useCSRF();

  return async (url: string, options: RequestInit = {}) => {
    // Read token from cookie to ensure consistency with middleware validation
    // This prevents stale closure issues where context token differs from cookie
    const getCookieToken = () => {
      if (typeof document === "undefined") return null;
      if (!document.cookie) return null;
      const match = document.cookie.match(/(?:^|; )csrfToken=([^;]*)/);
      return match ? decodeURIComponent(match[1]) : null;
    };

    let token = getCookieToken() || csrfToken;

    // Lazily fetch token if missing for non-GET requests
    if (
      (!token || token === "") &&
      options.method &&
      options.method !== "GET"
    ) {
      token = await ensureToken();
      // Re-read from cookie after ensureToken sets it
      token = getCookieToken() || token;
    }

    const headers = new Headers(options.headers);

    // Add CSRF token to headers for non-GET requests
    if (token && options.method && options.method !== "GET") {
      headers.set("X-CSRF-Token", token);
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: options.credentials ?? "include",
    });
  };
}
