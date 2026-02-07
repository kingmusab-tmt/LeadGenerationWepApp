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
import { CALL_DEFAULTS } from "@/lib/security/callSecurity";

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
  // Normalize numbers for comparison (strip non-digit chars except +)
  const normalize = (num: string) => num.replace(/[^+\d]/g, "");
  const normalizedPhone = normalize(phoneNumber);
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

/**
 * Match a caller's area code to a buyer's service locations.
 * Returns true if the buyer services the caller's area.
 */
export function doesBuyerServiceArea(buyerDoc: any, geoData: GeoData): boolean {
  if (!buyerDoc?.serviceLocations) return true; // No locations = serves everywhere

  const locations = buyerDoc.serviceLocations;

  // Check city match
  if (geoData.city && locations.city) {
    const buyerCities = Array.isArray(locations.city)
      ? locations.city
      : [locations.city];
    if (
      buyerCities.some(
        (c: string) => c.toLowerCase() === geoData.city!.toLowerCase(),
      )
    ) {
      return true;
    }
  }

  // Check state match
  if (geoData.state && locations.state) {
    const buyerStates = Array.isArray(locations.state)
      ? locations.state
      : [locations.state];
    if (
      buyerStates.some(
        (s: string) => s.toLowerCase() === geoData.state!.toLowerCase(),
      )
    ) {
      return true;
    }
  }

  // Check zipCodes match (if we had zip code info)
  // For now, if city and state don't match and buyer has locations configured, return false
  if (
    (locations.city && locations.city.length > 0) ||
    (locations.state && locations.state.length > 0)
  ) {
    return false;
  }

  return true; // No specific locations configured
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
