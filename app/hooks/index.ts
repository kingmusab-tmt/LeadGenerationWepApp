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

// Notification hook
export { useNotification } from "./useNotification";

// Stripe hook
export { useStripePromise } from "./useStripe";

// Session refresh hook (for subscription changes)
export { useSessionRefresh } from "./useSessionRefresh";

// Subscription cancellation hook
export {
  useSubscriptionCancel,
  CANCELLATION_REASONS,
  CANCELLATION_REASON_LABELS,
} from "./useSubscriptionCancel";
export type { CancellationReason } from "./useSubscriptionCancel";

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
