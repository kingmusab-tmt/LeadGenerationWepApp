import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import Call from "@/models/call";
import { debugLog, addVoicemailToTwiml } from "@/utils/callHandlers";
import { callSecurityMiddleware } from "@/lib/security/callSecurity";

/**
 * POST /api/calls/twilio/fallback
 *
 * Called when a buyer rejects a call (presses digit 2) or when all buyers have rejected/no-answer.
 * Handles fallback routing:
 * 1. Try overflow number if configured
 * 2. Play "Agents unavailable" message
 * 3. Go to voicemail
 *
 * Query params:
 * - sellerId: Seller ID
 * - callSid: Parent call SID
 * - tryOverflow: Whether to attempt overflow number first (true/false)
 */
export async function POST(req: NextRequest) {
  try {
    const shouldValidateWebhook = process.env.NODE_ENV === "production";
    if (!shouldValidateWebhook) {
      debugLog(
        "Skipping Twilio webhook validation in non-production (fallback)",
        {
          nodeEnv: process.env.NODE_ENV,
        },
      );
    }

    const securityResponse = await callSecurityMiddleware(req, {
      rateLimit: true,
      validateWebhook: shouldValidateWebhook,
    });
    if (securityResponse) return securityResponse;

    const { searchParams } = new URL(req.url);
    const sellerId = searchParams.get("sellerId") || "";
    const callSid = searchParams.get("callSid") || "";
    const trackingNumber = searchParams.get("trackingNumber") || "";
    const tryOverflow = searchParams.get("tryOverflow") !== "false";
    const buyerNumber = searchParams.get("buyerNumber") || "";

    debugLog("Fallback handler invoked", {
      sellerId,
      callSid,
      trackingNumber,
      tryOverflow,
      buyerNumber,
    });

    await dbConnect();

    // Find the call record to get config
    const callRecord = (await Call.findOne({ callSid }).lean()) as {
      from?: string;
      to?: string;
    } | null;
    if (!callRecord) {
      debugLog("Call record not found for fallback", { callSid }, "warn");
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say("Call failed. Please try again later.");
      twiml.hangup();
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Find seller and tracking config
    const seller = await User.findById(sellerId).lean();
    if (!seller) {
      debugLog("Seller not found for fallback", { sellerId }, "warn");
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say("Call routing failed. Please try again later.");
      twiml.hangup();
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    const trackingNumberConfig = (seller.trackingNumbers || []).find(
      (tn: { phoneNumber: string }) => tn.phoneNumber === trackingNumber,
    ) as
      | { phoneNumber: string; overflowNumber?: string; [key: string]: unknown }
      | undefined;

    if (!trackingNumberConfig) {
      debugLog(
        "Tracking number config not found for fallback",
        {
          sellerId,
          trackingNumber,
        },
        "warn",
      );
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say("Call routing failed. Please try again later.");
      twiml.hangup();
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    const twiml = new twilio.twiml.VoiceResponse();

    debugLog("Building fallback response", {
      hasOverflow: !!trackingNumberConfig.overflowNumber,
      tryOverflow,
    });

    // Attempt overflow if configured
    if (tryOverflow && trackingNumberConfig.overflowNumber) {
      debugLog("Attempting overflow number", {
        overflow: trackingNumberConfig.overflowNumber,
      });

      twiml.say("Please hold while we connect you.");
      const dial = twiml.dial({
        callerId: callRecord?.from,
        timeout: 20,
        timeLimit: 3600,
      });
      dial.number(trackingNumberConfig.overflowNumber);
    } else {
      // No overflow or already tried — inform caller
      debugLog("No overflow available or already attempted fallback", {
        hasOverflow: !!trackingNumberConfig.overflowNumber,
      });

      twiml.say(
        "Our agents are currently not available. Please try again later or leave a message after the tone.",
      );
    }

    // Fallback to voicemail
    addVoicemailToTwiml(twiml, { sellerId, callSid });

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    debugLog("Fallback handler error", { error }, "error");
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say("An error occurred. Please try again later.");
    twiml.hangup();
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
