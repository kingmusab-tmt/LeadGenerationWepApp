import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { debugLog } from "@/utils/callHandlers";
import {
  callSecurityMiddleware,
  CALL_DEFAULTS,
} from "@/lib/security/callSecurity";

/**
 * POST /api/calls/twilio/queue
 * Handles callers placed in a queue — plays hold music while waiting for a buyer.
 * This is triggered when a caller is enqueued via TwiML <Enqueue>.
 *
 * Twilio sends a waitUrl callback asking what to do while the caller waits.
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
    const queuePosition = formData.get("QueuePosition") as string;
    const queueTime = formData.get("QueueTime") as string;
    const queueSid = formData.get("QueueSid") as string;

    const { searchParams } = new URL(req.url);
    const sellerId = searchParams.get("sellerId");

    debugLog("Queue wait callback", {
      queuePosition,
      queueTime,
      queueSid,
      sellerId,
    });

    const twiml = new twilio.twiml.VoiceResponse();

    // Check if caller has been waiting too long — redirect to voicemail
    const waitSeconds = parseInt(queueTime || "0");
    if (waitSeconds >= CALL_DEFAULTS.holdMusicTimeout) {
      debugLog("Queue wait timeout — redirecting to voicemail", {
        waitSeconds,
        timeout: CALL_DEFAULTS.holdMusicTimeout,
      });

      twiml.say(
        "We apologize for the wait. No one is available right now. Please leave a message after the beep.",
      );
      twiml.record({
        maxLength: CALL_DEFAULTS.voicemailMaxLength,
        timeout: 5,
        playBeep: true,
        recordingStatusCallback: `https://${process.env.NEXT_PUBLIC_DOMAIN}/api/calls/voicemail`,
      });
      twiml.say("Thank you for your message. Goodbye.");
      twiml.leave(); // Remove caller from queue

      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Get seller's custom hold music URL if configured
    let holdMusicUrl = "";
    if (sellerId) {
      const seller = await User.findOne({ sellerId });
      holdMusicUrl = seller?.holdMusicUrl || "";
    }

    // Position announcement (first time and every 60 seconds)
    if (waitSeconds === 0 || waitSeconds % 60 === 0) {
      const position = parseInt(queuePosition || "1");
      if (position === 1) {
        twiml.say(
          "Your call is important to us. You are next in line. Please hold.",
        );
      } else {
        twiml.say(
          `Your call is important to us. You are number ${position} in the queue. Please hold.`,
        );
      }
    }

    // Play hold music
    if (holdMusicUrl) {
      twiml.play({ loop: 1 }, holdMusicUrl);
    } else {
      // Default: use Twilio's built-in hold music
      twiml.play(
        { loop: 1 },
        "http://com.twilio.sounds.music.s3.amazonaws.com/ClockworkWaltz.mp3",
      );
    }

    // Pause briefly then callback again (Twilio re-requests waitUrl)
    twiml.pause({ length: 2 });

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    debugLog("Queue handler failed", { error }, "error");
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say("An error occurred. Please try again later.");
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
