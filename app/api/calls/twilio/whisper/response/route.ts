import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { debugLog } from "@/utils/callHandlers";
import { callSecurityMiddleware } from "@/lib/security/callSecurity";

/**
 * POST /api/calls/twilio/whisper/response
 * Handles the buyer's digit response for call screening.
 * If the buyer pressed a valid digit, the call connects.
 * If invalid, the call is rejected.
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
    const sellerId = searchParams.get("sellerId") || "";
    const callSid = searchParams.get("callSid") || "";

    debugLog("Whisper response received", {
      headers: headersObj,
      form: formObj,
      digits,
      validDigits,
      sellerId,
      callSid,
    });

    const twiml = new twilio.twiml.VoiceResponse();

    if (digits && validDigits.includes(digits)) {
      // Buyer accepted — the call will be connected (empty TwiML = connect)
      debugLog("Buyer accepted call via screening", { digit: digits });
      twiml.say("Connecting you now.");
    } else {
      // Buyer rejected or pressed invalid digit — hang up this leg
      debugLog("Buyer rejected or invalid digit", { digits, validDigits });
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
