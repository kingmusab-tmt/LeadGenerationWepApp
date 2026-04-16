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
export { CancellationFeedback } from "./cancellationFeedback";
export { Buyer } from "./leadbuyers";
export { Lead } from "./leads";
export { default as Form } from "./form";
export { Campaign } from "./campaign";
export { Invoice } from "./invoice";
export { AutomationWorkflow, WorkflowExecution } from "./automationWorkflow";

// Re-export types
export type { IUser } from "./types/user";
export type { ISubscription } from "./types/subscription";
export type { ITrackingNumber } from "./types/tracking";
export type { INotification } from "./types/notification";
export type { IBuyer, IBuyerCriteriaSet } from "./leadbuyers";
export type { ILead } from "./leads";
export type { IForm } from "./form";
export type { ICampaign } from "./campaign";
export type { IInvoice, IInvoiceLineItem } from "./invoice";
export type {
  IAutomationWorkflow,
  IWorkflowExecution,
  TriggerType,
  ActionType,
  ConditionOperator,
  ICondition,
  IAction,
} from "./automationWorkflow";
export type {
  ICancellationFeedback,
  CancellationReason,
} from "./cancellationFeedback";
export { CANCELLATION_REASONS } from "./cancellationFeedback";

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
