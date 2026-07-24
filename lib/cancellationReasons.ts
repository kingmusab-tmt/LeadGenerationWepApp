/**
 * Cancellation reasons for subscription cancellation feedback.
 * Client-safe (no mongoose import) so both the Mongoose model and
 * client components can share a single source of truth.
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
