import { getCookie, setCookie, deleteCookie } from "@/lib/cookieUtils";

const TRIAL_INTENT_COOKIE = "trialIntent";
// Long enough to survive a full Google OAuth round-trip (account picker,
// 2FA, consent screen) without expiring mid-flow.
const TRIAL_INTENT_MINUTES = 30;

/**
 * Mark that the user clicked a "start free trial" CTA, so the
 * sign-in/complete-registration flow knows to start the trial once a role is
 * assigned. A single cookie is the source of truth — it's the only signal
 * guaranteed to survive the full-page redirect through Google's OAuth flow.
 */
export function setTrialIntent(): void {
  setCookie(TRIAL_INTENT_COOKIE, "true", TRIAL_INTENT_MINUTES);
}

/**
 * Whether trial intent is active, checking both the durable cookie and an
 * optional `?trial=true` URL param (a bookmarked/shared link should count
 * too, and it costs nothing to also honor it).
 */
export function hasTrialIntent(searchParams?: URLSearchParams): boolean {
  if (searchParams?.get("trial") === "true") return true;
  return getCookie(TRIAL_INTENT_COOKIE) === "true";
}

export function clearTrialIntent(): void {
  deleteCookie(TRIAL_INTENT_COOKIE);
}
