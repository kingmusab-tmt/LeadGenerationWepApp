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
    const securityResponse = await callSecurityMiddleware(req, {
      rateLimit: true,
      validateWebhook: true,
    });
    if (securityResponse) return securityResponse;

    const formData = await req.formData();
    const digits = formData.get("Digits") as string;

    const { searchParams } = new URL(req.url);
    const validDigits = searchParams.get("validDigits") || "";
    const sellerId = searchParams.get("sellerId") || "";
    const callSid = searchParams.get("callSid") || "";

    debugLog("Whisper response received", {
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
