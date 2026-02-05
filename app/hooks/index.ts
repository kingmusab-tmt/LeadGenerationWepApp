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

// Navigation hooks and provider
export { useNavigation, useNavigationRouter } from "./useNavigation";
export { NavigationProvider, NavigationContext } from "./useNavigationProvider";

// CSRF protection hooks
export { useCSRF, useCSRFFetch, CSRFProvider } from "./useCSRF";
