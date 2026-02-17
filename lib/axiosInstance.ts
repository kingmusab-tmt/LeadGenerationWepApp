/**
 * Axios Instance Configuration with CSRF Token Support
 *
 * Automatically adds CSRF token to all state-changing requests (POST, PUT, PATCH, DELETE)
 * Uses document.cookie to retrieve the token for consistency with middleware validation
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

// Define methods that require CSRF protection
const CSRF_PROTECTED_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

/**
 * Extract CSRF token from cookies
 */
function getCsrfTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  if (!document.cookie) return null;

  const match = document.cookie.match(/(?:^|; )csrfToken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Create and configure axios instance
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: "/",
  withCredentials: true, // Include cookies in requests
});

/**
 * Request interceptor: Add CSRF token to state-changing requests
 */
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Only add CSRF token for state-modifying methods
    if (
      config.method &&
      CSRF_PROTECTED_METHODS.includes(config.method.toUpperCase())
    ) {
      const csrfToken = getCsrfTokenFromCookie();

      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken;
      } else {
        console.warn(
          `[Axios] CSRF token not found for ${config.method?.toUpperCase()} ${config.url}`,
        );
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

/**
 * Response interceptor: Handle common error scenarios
 */
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log CSRF errors specifically
    if (error.response?.status === 403) {
      const errorMessage = error.response?.data?.error || error.message;
      if (errorMessage?.includes("CSRF")) {
        console.error("[Axios] CSRF validation failed:", errorMessage);
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
