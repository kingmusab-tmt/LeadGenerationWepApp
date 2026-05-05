import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { debugLog } from "@/utils/callHandlers";
import { callSecurityMiddleware } from "@/lib/security/callSecurity";
import { env } from "@/lib/env";

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
    const buyerNumber = (formObj["Called"] as string) || "";
    const trackingNumber = searchParams.get("trackingNumber") || "";

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
      // Buyer explicitly declined — instruct backend to redirect the parent call
      debugLog("Buyer rejected call via screening", { digit: digits });
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        process.env.NEXTAUTH_URL ||
        `https://${env.NEXT_PUBLIC_DOMAIN}`;
      const fallbackUrl = `${baseUrl.replace(/\/$/, "")}/api/calls/twilio/fallback?sellerId=${sellerId}&callSid=${callSid}&trackingNumber=${encodeURIComponent(
        trackingNumber,
      )}&tryOverflow=true&buyerNumber=${encodeURIComponent(buyerNumber)}`;

      try {
        const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
        // Update the parent call to fetch fallback TwiML which will dial overflow
        await client
          .calls(callSid)
          .update({ url: fallbackUrl, method: "POST" });
        debugLog("Parent call redirected to fallback via REST API", {
          callSid,
          fallbackUrl: fallbackUrl.replace(buyerNumber, "[hidden]"),
        });
      } catch (err) {
        debugLog(
          "Failed to redirect parent call via REST API",
          { err },
          "error",
        );
      }

      // End this buyer leg
      twiml.say("Call declined.");
      twiml.hangup();
    } else {
      // Buyer pressed an invalid digit (or no digit) — redirect to fallback.
      debugLog("Buyer rejected or invalid digit", {
        digits,
        validDigits,
        acceptDigits,
      });
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        process.env.NEXTAUTH_URL ||
        `https://${env.NEXT_PUBLIC_DOMAIN}`;
      const fallbackUrl = `${baseUrl.replace(/\/$/, "")}/api/calls/twilio/fallback?sellerId=${sellerId}&callSid=${callSid}&trackingNumber=${encodeURIComponent(
        trackingNumber,
      )}&tryOverflow=true&buyerNumber=${encodeURIComponent(buyerNumber)}`;

      try {
        const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
        await client
          .calls(callSid)
          .update({ url: fallbackUrl, method: "POST" });
        debugLog(
          "Parent call redirected to fallback via REST API (invalid digit)",
          {
            callSid,
            fallbackUrl: fallbackUrl.replace(buyerNumber, "[hidden]"),
          },
        );
      } catch (err) {
        debugLog(
          "Failed to redirect parent call via REST API (invalid digit)",
          { err },
          "error",
        );
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
