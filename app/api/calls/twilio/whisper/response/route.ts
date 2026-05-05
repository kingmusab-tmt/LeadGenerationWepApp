import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { debugLog } from "@/utils/callHandlers";
import { callSecurityMiddleware } from "@/lib/security/callSecurity";

/**
 * POST /api/calls/twilio/whisper/response
 * Handles the buyer's digit response for call screening.
 * If the buyer pressed an accept digit, the call connects.
 * If the buyer pressed a reject/other valid digit (or invalid input), the call is rejected.
 */
export async function POST(req: NextRequest) {
  try {
    const shouldValidateWebhook = process.env.NODE_ENV === "production";
    if (!shouldValidateWebhook) {
      debugLog("Skipping Twilio webhook validation in non-production", {
        nodeEnv: process.env.NODE_ENV,
      });
    }

    const securityResponse = await callSecurityMiddleware(req, {
      rateLimit: true,
      validateWebhook: shouldValidateWebhook,
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

    debugLog("Whisper response received", {
      headers: headersObj,
      form: formObj,
      digits,
      validDigits,
      acceptDigits,
      sellerId,
      callSid,
    });

    const twiml = new twilio.twiml.VoiceResponse();

    const isValidDigit = !!digits && validDigits.includes(digits);
    const isAcceptedDigit = !!digits && acceptDigits.includes(digits);

    if (isAcceptedDigit) {
      // Buyer accepted — connect this dial leg to the caller.
      debugLog("Buyer accepted call via screening", { digit: digits });
      twiml.say("Connecting you now.");
    } else if (isValidDigit) {
      // Buyer explicitly declined.
      debugLog("Buyer rejected call via screening", { digit: digits });
      twiml.say("Call declined.");
      twiml.hangup();
    } else {
      // Buyer pressed an invalid digit (or no digit).
      debugLog("Buyer rejected or invalid digit", {
        digits,
        validDigits,
        acceptDigits,
      });
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
