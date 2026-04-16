import dbConnect from "@/lib/connectdb";
import { createScheduledCallback } from "@/utils/callFeatureServices";
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { callSecurityMiddleware } from "@/lib/security/callSecurity";

/**
 * Callback Request Handler
 * Handles the IVR digit press when a caller requests a callback.
 * Called by Twilio <Gather> action URL.
 */
export async function POST(req: NextRequest) {
  try {
    const securityResponse = await callSecurityMiddleware(req, {
      rateLimit: true,
      validateWebhook: true,
    });
    if (securityResponse) return securityResponse;

    await dbConnect();

    const formData = await req.formData();
    const digits = (formData.get("Digits") as string) || "";
    const callSid = req.nextUrl.searchParams.get("callSid") || "";
    const from = decodeURIComponent(req.nextUrl.searchParams.get("from") || "");
    const to = decodeURIComponent(req.nextUrl.searchParams.get("to") || "");
    const sellerId = req.nextUrl.searchParams.get("sellerId") || "";
    const industry = req.nextUrl.searchParams.get("industry") || "";

    const twiml = new twilio.twiml.VoiceResponse();

    if (digits === "1") {
      // Create a scheduled callback
      await createScheduledCallback({
        sellerId,
        callerPhone: from,
        trackingNumber: to,
        industry,
        callSid,
      });

      twiml.say(
        "Thank you. A callback has been requested. One of our representatives will call you back shortly. Goodbye.",
      );
      twiml.hangup();
    } else {
      twiml.say("No selection was made. Goodbye.");
      twiml.hangup();
    }

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Error handling callback request:", error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say(
      "We encountered an error processing your request. Please try again later.",
    );
    twiml.hangup();
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
