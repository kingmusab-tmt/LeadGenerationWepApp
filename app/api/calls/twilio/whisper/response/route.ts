import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { debugLog } from "@/utils/callHandlers";
import { callSecurityMiddleware } from "@/lib/security/callSecurity";
import { env } from "@/lib/env";
import { getRedisClient } from "@/lib/redis";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";

const SCREEN_REJECT_TTL = 600; // 10 minutes

/**
 * POST /api/calls/twilio/whisper/response
 * Handles the buyer's digit response for call screening.
 * If the buyer pressed an accept digit, the call connects.
 * If the buyer pressed a reject/other valid digit (or invalid input), the call is rejected.
 */
export async function POST(req: NextRequest) {
  try {
    // validateTwilioWebhook already carves out its own narrow, explicit
    // development-only bypass — matching the other call routes by always
    // requesting validation here (rather than a second, wider "skip unless
    // NODE_ENV is exactly 'production'" gate) means a preview/staging
    // deployment that isn't literally NODE_ENV=production still gets real
    // signature checking instead of silently skipping it.
    const securityResponse = await callSecurityMiddleware(req, {
      rateLimit: true,
      validateWebhook: true,
    });
    if (securityResponse) return securityResponse;

    // Log incoming headers (first-level) to help diagnose POST failures
    const headersObj: Record<string, string | null> = {};
    for (const [k, v] of req.headers) {
      headersObj[k] = v;
    }

    const formData = await req.formData();
    // Capture all form fields for debugging (Twilio sends application/x-www-form-urlencoded)
    const formObj: Record<string, string> = {};
    formData.forEach((value, key) => {
      formObj[key] = String(value);
    });

    const digits =
      (formObj["Digits"] as string) || (formData.get("Digits") as string);

    const { searchParams } = new URL(req.url);
    const validDigits = searchParams.get("validDigits") || "";
    const acceptDigits = searchParams.get("acceptDigits") || "";
    const sellerId = searchParams.get("sellerId") || "";
    const callSid = searchParams.get("callSid") || "";
    const buyerNumber = (formObj["Called"] as string) || "";
    const trackingNumber = searchParams.get("trackingNumber") || "";
    const multiRing = searchParams.get("multiRing") === "true";
    const legCount = Number.parseInt(searchParams.get("legCount") || "0", 10);

    debugLog("Whisper response received", {
      headers: headersObj,
      form: formObj,
      digits,
      validDigits,
      acceptDigits,
      sellerId,
      callSid,
      multiRing,
      legCount,
    });

    const twiml = new twilio.twiml.VoiceResponse();

    const isValidDigit = !!digits && validDigits.includes(digits);
    const isAcceptedDigit = !!digits && acceptDigits.includes(digits);

    const baseUrl = (
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXTAUTH_URL ||
      `https://${env.NEXT_PUBLIC_DOMAIN}`
    ).replace(/\/$/, "");
    const fallbackUrl = `${baseUrl}/api/calls/twilio/fallback?sellerId=${sellerId}&callSid=${callSid}&trackingNumber=${encodeURIComponent(
      trackingNumber,
    )}&tryOverflow=true&buyerNumber=${encodeURIComponent(buyerNumber)}`;

    // Resolve which Twilio account actually owns this call's parent leg.
    // Numbers registered with method "Manual" live in the seller's own
    // Twilio subaccount (see register_number/route.ts) — a REST call made
    // with system credentials against a callSid in a different account
    // returns a 404 from Twilio and fails silently (caught below), leaving
    // the caller in dead air instead of being redirected to fallback/voicemail.
    const resolveCallClient = async (): Promise<ReturnType<typeof twilio>> => {
      const systemClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
      if (!sellerId || !trackingNumber) return systemClient;
      try {
        await dbConnect();
        const seller = await User.findById(sellerId).lean();
        const trackingNumbers = (
          seller as unknown as {
            trackingNumbers?: { phoneNumber: string; method?: string }[];
          }
        )?.trackingNumbers;
        const trackingConfig = trackingNumbers?.find(
          (num) => num.phoneNumber === trackingNumber,
        );
        const sellerCreds = seller as unknown as {
          twilioAccountSid?: string;
          twilioAuthToken?: string;
        };
        if (
          trackingConfig?.method === "Manual" &&
          sellerCreds?.twilioAccountSid &&
          sellerCreds?.twilioAuthToken
        ) {
          return twilio(sellerCreds.twilioAccountSid, sellerCreds.twilioAuthToken);
        }
      } catch (err) {
        debugLog(
          "Failed to resolve seller Twilio credentials — falling back to system client",
          { sellerId, trackingNumber, err },
          "warn",
        );
      }
      return systemClient;
    };

    // Redirect the parent call to the fallback handler (overflow → voicemail).
    // Used when a non-multi-ring buyer rejects, or when the LAST multi-ring
    // leg rejects (so the caller is not left in dead air).
    const redirectParentToFallback = async (reason: string) => {
      try {
        const client = await resolveCallClient();
        await client
          .calls(callSid)
          .update({ url: fallbackUrl, method: "POST" });
        debugLog("Parent call redirected to fallback via REST API", {
          callSid,
          reason,
          fallbackUrl: fallbackUrl.replace(buyerNumber, "[hidden]"),
        });
      } catch (err) {
        debugLog(
          "Failed to redirect parent call via REST API",
          { err, reason },
          "error",
        );
      }
    };

    // For multi-ring screening, decide whether this rejection was the final
    // leg. Only the final rejection should tear down the parent call; earlier
    // rejections must leave the other ringing legs intact.
    const isFinalMultiRingRejection = async (): Promise<boolean> => {
      if (!multiRing) return true; // single-leg: always redirect parent
      if (legCount <= 1) return true; // only one leg — treat as final
      try {
        const redis = await getRedisClient();
        if (!redis) {
          // Redis unavailable: fail safe by NOT tearing down the parent so
          // the other ringing legs can still be answered.
          debugLog(
            "Redis unavailable for multi-ring reject tracking — only hanging up this leg",
            { callSid },
            "warn",
          );
          return false;
        }
        const key = `screenReject:${callSid}`;
        const rejectCount = await redis.incr(key);
        await redis.expire(key, SCREEN_REJECT_TTL);
        debugLog("Multi-ring screening rejection recorded", {
          callSid,
          rejectCount,
          legCount,
        });
        return rejectCount >= legCount;
      } catch (err) {
        debugLog(
          "Error tracking multi-ring rejection — only hanging up this leg",
          { callSid, err },
          "warn",
        );
        return false;
      }
    };

    if (isAcceptedDigit) {
      // Buyer accepted — connect this dial leg to the caller.
      debugLog("Buyer accepted call via screening", { digit: digits });
      twiml.say("Connecting you now.");
    } else if (isValidDigit) {
      // Buyer explicitly declined.
      debugLog("Buyer rejected call via screening", {
        digit: digits,
        multiRing,
      });
      if (await isFinalMultiRingRejection()) {
        await redirectParentToFallback("buyer rejected");
      }
      // End this buyer leg (other multi-ring legs keep ringing).
      twiml.say("Call declined.");
      twiml.hangup();
    } else {
      // Buyer pressed an invalid digit (or no digit).
      debugLog("Buyer rejected or invalid digit", {
        digits,
        validDigits,
        acceptDigits,
        multiRing,
      });
      if (await isFinalMultiRingRejection()) {
        await redirectParentToFallback("invalid digit");
      }
      twiml.say("Call declined.");
      twiml.hangup();
    }

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    debugLog("Whisper response handler failed", { error }, "error");
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.hangup();
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
