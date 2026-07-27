/**
 * Call Feature Services
 * Provides helper functions for call tracking features:
 * - Recording consent
 * - DNC list checking
 * - Spam detection (STIR/SHAKEN)
 * - Missed call text-back
 * - Scheduled callback IVR
 * - Geo-routing (area code → city/state)
 * - Concurrent call tracking
 * - Multi-ring
 */

import { sendSMS } from "@/utils/notifications";
import { getRedisClient } from "@/lib/redis";
import Call from "@/models/call";
import ScheduledCallback from "@/models/scheduledCallback";
import cityAreaCodes from "@/utils/cityareacodes";

// ─── STIR/SHAKEN Spam Detection ───────────────────────────────

export interface SpamCheckResult {
  isSpam: boolean;
  stirVerstat: string;
  spamScore: number;
  reason?: string;
}

/**
 * Check if a call is spam based on Twilio's STIR/SHAKEN attestation.
 * StirVerstat values: "TN-Validation-Passed-A" (highest), "-B", "-C", "TN-Validation-Failed", etc.
 */
export function checkSpamStatus(
  stirVerstat: string | null,
  from: string,
): SpamCheckResult {
  const verstat = stirVerstat || "";
  let spamScore = 50; // neutral default
  let isSpam = false;
  let reason = "";

  if (verstat.includes("TN-Validation-Passed-A")) {
    spamScore = 0; // Fully verified
  } else if (verstat.includes("TN-Validation-Passed-B")) {
    spamScore = 20; // Partially verified
  } else if (verstat.includes("TN-Validation-Passed-C")) {
    spamScore = 40; // Gateway verified
  } else if (verstat.includes("TN-Validation-Failed")) {
    spamScore = 90;
    isSpam = true;
    reason = "STIR/SHAKEN validation failed";
  } else if (verstat === "" || verstat.includes("No-TN-Validation")) {
    spamScore = 60; // No info available
  }

  // Additional heuristics
  if (from && (from.startsWith("+1900") || from.startsWith("+1976"))) {
    spamScore = 95;
    isSpam = true;
    reason = "Premium rate number detected";
  }

  return { isSpam, stirVerstat: verstat, spamScore, reason };
}

/**
 * Check if a phone number is on the DNC list for a tracking number.
 */
export function isOnDncList(
  phoneNumber: string,
  dncList: string[] | undefined,
): boolean {
  if (!dncList || dncList.length === 0) return false;
  // Normalize numbers for comparison: keep only digits and drop the US/Canada
  // country code so "+15551234567", "15551234567" and "5551234567" all match.
  const normalize = (num: string) => {
    const digits = (num || "").replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("1")) {
      return digits.slice(1);
    }
    return digits;
  };
  const normalizedPhone = normalize(phoneNumber);
  if (!normalizedPhone) return false;
  return dncList.some((blocked) => normalize(blocked) === normalizedPhone);
}

// ─── Missed Call Text-Back ─────────────────────────────────────

/**
 * Send a text-back SMS to the caller when the call goes to voicemail.
 * Non-blocking, never throws.
 */
export async function sendMissedCallTextBack(
  callerPhone: string,
  message: string,
  callSid: string,
): Promise<void> {
  try {
    await sendSMS(callerPhone, message);
    // Mark the call as having sent text-back
    await Call.updateOne({ callSid }, { $set: { textBackSent: true } });
  } catch (error) {
    console.error("[TextBack] Failed to send SMS:", error);
  }
}

// ─── Scheduled Callbacks ───────────────────────────────────────

/**
 * Create a scheduled callback request from a caller.
 */
export async function createScheduledCallback(options: {
  sellerId: string;
  callerPhone: string;
  trackingNumber: string;
  industry: string;
  callSid: string;
}): Promise<void> {
  try {
    await ScheduledCallback.create({
      sellerId: options.sellerId,
      callerPhone: options.callerPhone,
      trackingNumber: options.trackingNumber,
      industry: options.industry,
      callSid: options.callSid,
      status: "pending",
      scheduledFor: new Date(), // ASAP
    });
  } catch (error) {
    console.error("[ScheduledCallback] Failed to create:", error);
  }
}

// ─── Geo-Routing ───────────────────────────────────────────────

// Build reverse lookup: area code → city name
const areaCodeToCity: Record<string, string> = {};
for (const [city, code] of Object.entries(cityAreaCodes)) {
  areaCodeToCity[code] = city;
}

// Area code → state mapping (US only, common codes)
const areaCodeToState: Record<string, string> = {
  "212": "NY",
  "213": "CA",
  "214": "TX",
  "312": "IL",
  "313": "MI",
  "404": "GA",
  "410": "MD",
  "415": "CA",
  "480": "AZ",
  "502": "KY",
  "503": "OR",
  "504": "LA",
  "505": "NM",
  "512": "TX",
  "513": "OH",
  "515": "IA",
  "516": "NY",
  "562": "CA",
  "602": "AZ",
  "614": "OH",
  "617": "MA",
  "623": "AZ",
  "702": "NV",
  "704": "NC",
  "713": "TX",
  "714": "CA",
  "716": "NY",
  "718": "NY",
  "720": "CO",
  "801": "UT",
  "808": "HI",
  "816": "MO",
  "817": "TX",
  "818": "CA",
  "860": "CT",
  "904": "FL",
  "907": "AK",
  "915": "TX",
  "920": "WI",
  "954": "FL",
  "303": "CO",
  "304": "WV",
  "305": "FL",
  "317": "IN",
  "321": "FL",
  "334": "AL",
  "336": "NC",
  "407": "FL",
  "412": "PA",
  "414": "WI",
  "423": "TN",
  "484": "PA",
  "501": "AR",
  "508": "MA",
  "510": "CA",
  "540": "VA",
  "541": "OR",
  "559": "CA",
  "571": "VA",
  "601": "MS",
  "615": "TN",
  "616": "MI",
  "619": "CA",
  "626": "CA",
  "630": "IL",
  "661": "CA",
  "678": "GA",
  "757": "VA",
  "770": "GA",
  "772": "FL",
  "804": "VA",
  "805": "CA",
  "832": "TX",
  "843": "SC",
  "847": "IL",
  "850": "FL",
  "858": "CA",
  "859": "KY",
  "901": "TN",
  "910": "NC",
  "916": "CA",
  "919": "NC",
  "925": "CA",
  "941": "FL",
  "949": "CA",
  "951": "CA",
  "972": "TX",
  "973": "NJ",
};

export interface GeoData {
  areaCode: string;
  city?: string;
  state?: string;
}

// ─── Two-Party (All-Party) Consent Recording Enforcement ──────

/**
 * US states commonly treated as requiring all-party consent to record a
 * phone call, rather than the one-party-consent default most states use.
 * Compiled from generally-cited public legal references (e.g. Justia's and
 * the Digital Media Law Project's state-by-state call-recording law
 * summaries) — this is engineering due diligence, not a legal opinion, and
 * a few of these (Montana, Nevada) have genuinely contested/hybrid case
 * law rather than a clean statutory rule. State laws change, and
 * interstate calls can implicate more than one state's law at once
 * regardless of what this list says. Treat this as a conservative
 * starting point pending the Phase 3 legal review this finding already
 * calls for, not a substitute for it.
 */
export const ALL_PARTY_CONSENT_STATES = new Set([
  "CA", // California
  "CT", // Connecticut
  "FL", // Florida
  "IL", // Illinois
  "MD", // Maryland
  "MA", // Massachusetts
  "MT", // Montana
  "NV", // Nevada
  "NH", // New Hampshire
  "PA", // Pennsylvania
  "WA", // Washington
]);

/**
 * Whether a resolved US state requires all-party consent to record a call.
 * Returns false for an undetermined state (international/non-NANP callers,
 * or an area code this app doesn't have a state mapping for) — treating
 * "unknown" as "don't record" would silently disable recording far more
 * broadly than the actual legal requirement, which is its own problem.
 */
export function requiresAllPartyConsent(state: string | undefined): boolean {
  if (!state) return false;
  return ALL_PARTY_CONSENT_STATES.has(state.toUpperCase());
}

/**
 * Extract geo data from a phone number's area code.
 */
export function extractGeoData(phoneNumber: string): GeoData {
  // Strip to digits, handle +1NXXNXXXXXX format
  const digits = phoneNumber.replace(/\D/g, "");
  let areaCode = "";

  if (digits.length === 11 && digits.startsWith("1")) {
    areaCode = digits.substring(1, 4);
  } else if (digits.length === 10) {
    areaCode = digits.substring(0, 3);
  }

  return {
    areaCode,
    city: areaCodeToCity[areaCode],
    state: areaCodeToState[areaCode],
  };
}

type ServiceLocation = {
  city?: string;
  state?: string;
  country?: string;
  zipCodes?: string[];
  radius?: number;
};

type BuyerWithServiceLocations = {
  serviceLocations?: ServiceLocation[];
};

/**
 * Match a caller's area code to a buyer's service locations.
 * Returns true if the buyer services the caller's area.
 *
 * `serviceLocations` is stored as an array of individual {city, state, ...}
 * entries (see models/leadbuyers.ts), not a single object with city/state
 * arrays — a prior version of this function checked `.city`/`.state`
 * directly on that array, which are always `undefined` on a JS array, so
 * every buyer with configured service locations silently matched every
 * caller regardless of the configured area. This iterates the actual
 * entries instead.
 */
export function doesBuyerServiceArea(
  buyerDoc: BuyerWithServiceLocations | null | undefined,
  geoData: GeoData,
): boolean {
  const locations = buyerDoc?.serviceLocations;
  if (!locations || locations.length === 0) return true; // No locations = serves everywhere

  // extractGeoData only resolves 10/11-digit NANP numbers — international
  // callers (this app explicitly supports UK/Canada sellers) come through
  // with no areaCode/city/state at all. Treating "couldn't determine" the
  // same as "doesn't match" silently geo-filtered out every non-NANP caller
  // whenever a buyer had any service locations configured, regardless of
  // whether that buyer should legitimately serve them.
  if (!geoData.areaCode) return true;

  const hasAnyConfiguredCityOrState = locations.some(
    (loc) => loc.city || loc.state,
  );
  if (!hasAnyConfiguredCityOrState) return true; // No specific locations configured

  return locations.some((loc) => {
    if (geoData.city && loc.city?.toLowerCase() === geoData.city.toLowerCase()) {
      return true;
    }
    if (
      geoData.state &&
      loc.state?.toLowerCase() === geoData.state.toLowerCase()
    ) {
      return true;
    }
    return false;
  });
}

// ─── Concurrent Call Tracking ──────────────────────────────────

const ACTIVE_CALL_TTL = 3600; // 1 hour TTL for safety

/**
 * Check if a buyer has reached their concurrent call limit.
 * Uses Redis to track active calls.
 */
export async function isBuyerAtConcurrentLimit(
  buyerId: string,
  limit: number,
): Promise<boolean> {
  if (limit <= 0) return false; // 0 = unlimited

  try {
    const redis = await getRedisClient();
    if (!redis) return false; // Redis unavailable = fail open

    const key = `activeCalls:${buyerId}`;
    const count = await redis.sCard(key);
    return count >= limit;
  } catch {
    return false; // Fail open
  }
}

/**
 * Mark a call as active for a buyer (when forwarded).
 */
export async function markCallActive(
  buyerId: string,
  callSid: string,
): Promise<void> {
  try {
    const redis = await getRedisClient();
    if (!redis) return;

    const key = `activeCalls:${buyerId}`;
    await redis.sAdd(key, callSid);
    await redis.expire(key, ACTIVE_CALL_TTL);
  } catch {
    // Non-critical
  }
}

/**
 * Remove a call from active tracking (when completed/no-answer).
 */
export async function markCallInactive(
  buyerId: string,
  callSid: string,
): Promise<void> {
  try {
    const redis = await getRedisClient();
    if (!redis) return;

    const key = `activeCalls:${buyerId}`;
    await redis.sRem(key, callSid);
  } catch {
    // Non-critical
  }
}
