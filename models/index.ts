/**
 * Central Index for User Model Exports
 *
 * This file provides backward compatibility and unified exports
 * for all user-related models, schemas, and types.
 *
 * Migration Guide:
 * OLD: import { User, IUser } from "@/models/user"
 * NEW: import { User, IUser } from "@/models" or use individual imports
 */

// Re-export models
export { User } from "./userModel";
export { Notification } from "./notificationModel";
export { default as ScheduledCallback } from "./scheduledCallback";

// Re-export types
export type { IUser } from "./types/user";
export type { ISubscription } from "./types/subscription";
export type { ITrackingNumber } from "./types/tracking";
export type { INotification } from "./types/notification";

// Re-export schemas
export {
  TrackingNumberSchema,
  EmailSettingsSchema,
  ApiSettingsSchema,
  CreditSetupSchema,
  SubscriptionSchema,
  UnitPricingSchema,
  CallChargeSchema,
} from "./schemas/schemas";
