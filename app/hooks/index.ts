/**
 * Central export point for all custom hooks
 * Provides easy access to commonly used hooks throughout the application
 *
 * Usage:
 *   import { useInitializeUser, useNotification } from "@/app/hooks";
 */

// Redux hooks
export { useAppDispatch, useAppSelector } from "./useRedux";

// User hooks
export { useInitializeUser, normalizeUser } from "./useUser";
export { useDashboardTerms } from "./useDashboardTerms";
export type { DashboardTerms } from "./useDashboardTerms";

// Notification hook
export { useNotification } from "./useNotification";

// Stripe hook
export { useStripePromise } from "./useStripe";

// Session refresh hook (for subscription changes)
export { useSessionRefresh } from "./useSessionRefresh";

// Confirm dialog hook
export { useConfirm } from "./useConfirm";

// Usage tracking hook
export { useUsageTracking, USAGE_KEYS } from "./useUsageTracking";
export type { UsageKey } from "./useUsageTracking";

// Dashboard reducer injection helper
export { useDashboardReducers } from "./useDashboardReducers";

// Navigation hooks and provider
export { useNavigation, useNavigationRouter } from "./useNavigation";
export { NavigationProvider, NavigationContext } from "./useNavigationProvider";

// CSRF protection hooks
export { useCSRF, useCSRFFetch, CSRFProvider } from "./useCSRF";
