import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { debugLog } from "@/utils/callHandlers";
import { callSecurityMiddleware } from "@/lib/security/callSecurity";
import { env } from "@/lib/env";

/**
 * POST /api/calls/twilio/whisper
 * Called by Twilio when a buyer answers — plays a whisper message to the buyer
 * before connecting them to the caller.
 *
 * If requireResponse is true, uses <Gather> to require the buyer to press a
 * digit to accept the call (call screening).
 */
export async function POST(req: NextRequest) {
  try {
    const securityResponse = await callSecurityMiddleware(req, {
      rateLimit: true,
      validateWebhook: true,
    });
    if (securityResponse) return securityResponse;

    const { searchParams } = new URL(req.url);
    const whisperMessage = searchParams.get("whisper") || "";
    const requireResponse = searchParams.get("requireResponse") === "true";
    const buyerResponsesRaw = searchParams.get("buyerResponses") || "";
    const sellerId = searchParams.get("sellerId") || "";
    const callSid = searchParams.get("callSid") || "";
    const trackingNumber = searchParams.get("trackingNumber") || "";

    debugLog("Whisper/screening endpoint hit", {
      whisperMessage: !!whisperMessage,
      requireResponse,
      hasBuyerResponses: !!buyerResponsesRaw,
    });

    const twiml = new twilio.twiml.VoiceResponse();

    if (requireResponse && buyerResponsesRaw) {
      // Call Screening: play message and gather digit input from buyer
      let buyerResponses: { message: string; digit: string }[] = [];
      try {
        buyerResponses = JSON.parse(decodeURIComponent(buyerResponsesRaw));
      } catch {
        debugLog(
          "Failed to parse buyerResponses",
          { buyerResponsesRaw },
          "warn",
        );
      }

      if (buyerResponses.length > 0) {
        // Build the screening prompt
        const validDigits = buyerResponses.map((r) => r.digit).join("");
        // Accept digits are inferred from the response label so reject actions
        // (for example: "Reject Lead") do not accidentally connect the call.
        const inferredAcceptDigits = buyerResponses
          .filter((r) => /accept|connect|approve|yes/i.test(r.message))
          .map((r) => r.digit)
          .join("");
        const acceptDigits =
          inferredAcceptDigits || buyerResponses[0]?.digit || "";
        const screeningMessage = buyerResponses
          .map((r) => `Press ${r.digit} to ${r.message}.`)
          .join(" ");

        const fullMessage = whisperMessage
          ? `${whisperMessage}. ${screeningMessage}`
          : `You have an incoming lead call. ${screeningMessage}`;

        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL ||
          process.env.NEXTAUTH_URL ||
          `https://${env.NEXT_PUBLIC_DOMAIN}`;

        const gather = twiml.gather({
          numDigits: 1,
          action: `${baseUrl.replace(/\/$/, "")}/api/calls/twilio/whisper/response?sellerId=${sellerId}&callSid=${callSid}&validDigits=${validDigits}&acceptDigits=${acceptDigits}&trackingNumber=${encodeURIComponent(trackingNumber)}`,
          method: "POST",
          timeout: 10,
        });
        gather.say(fullMessage);

        // If no input, reject the call (buyer didn't respond)
        twiml.say("No response received. The call will not be connected.");
        twiml.hangup();
      } else {
        // Fallback: just play whisper and connect
        if (whisperMessage) {
          twiml.say(whisperMessage);
        }
      }
    } else if (whisperMessage) {
      // Whisper only (no screening): play message then connect
      twiml.say(whisperMessage);
    }

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    debugLog("Whisper handler failed", { error }, "error");
    const twiml = new twilio.twiml.VoiceResponse();
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
