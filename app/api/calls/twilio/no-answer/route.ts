import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import dbConnect from "@/lib/connectdb";
import Call from "@/models/call";
import type { ICall } from "@/models/call";
import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";
import {
  getNextRoundRobinBuyerAtomic,
  debugLog,
  addOverflowToTwiml,
  addVoicemailToTwiml,
  sendMissedCallTextBack,
} from "@/utils/callHandlers";
import { callSecurityMiddleware } from "@/lib/security/callSecurity";
import { env } from "@/lib/env";

function buildUnavailableTwiml(message: string, callSid: string) {
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say(message);
  addVoicemailToTwiml(twiml, {
    sellerId: "",
    callSid,
    message:
      "Our agents are currently busy. Please try again later or leave a voicemail after the beep.",
  });
  return twiml;
}

export async function POST(req: NextRequest) {
  try {
    // Security checks
    const securityResponse = await callSecurityMiddleware(req, {
      rateLimit: true,
      validateWebhook: true,
    });
    if (securityResponse) return securityResponse;

    await dbConnect();
    const formData = await req.formData();
    const childCallSid = (formData.get("CallSid") as string) || ""; // New CallSid for this forwarded leg
    const callStatus = formData.get("CallStatus") as string; // Call status (e.g., "no-answer")

    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const sellerId = searchParams.get("sellerId");
    const originalCallSid = searchParams.get("callSid") || undefined; // original parent callSid passed in the dial action

    const parentCallSid = originalCallSid;

    debugLog("No-answer webhook called", {
      requestUrl: req.url,
      sellerId,
      childCallSid,
      parentCallSid,
      callStatus,
      from: formData.get("From") || "",
      to: formData.get("To") || "",
    });

    if ((!childCallSid && !parentCallSid) || !callStatus || !sellerId) {
      console.error("Missing required parameters");
      const twiml = buildUnavailableTwiml(
        "Our agents are currently busy. Please try again later or leave a voicemail after the beep.",
        childCallSid || parentCallSid || "",
      );
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Find the seller associated with the call
    const seller = await User.findOne({ sellerId });

    if (!seller) {
      console.error(`Seller not found for sellerId: ${sellerId}`);
      const twiml = buildUnavailableTwiml(
        "Our agents are currently busy. Please try again later or leave a voicemail after the beep.",
        childCallSid || parentCallSid || "",
      );
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Find the call record by the forwarded leg CallSid first, then fall back
    // to the original parent CallSid (if provided in the action URL).
    let call: ICall | null = null;
    if (childCallSid) {
      call = await Call.findOne({ callSid: childCallSid });
    }
    if (!call && originalCallSid) {
      call = await Call.findOne({ callSid: originalCallSid });
    }

    // If we still couldn't find a call record, gracefully route to overflow/voicemail
    if (!call) {
      debugLog(
        `Call record not found for CallSid (child: ${childCallSid} parent: ${originalCallSid})`,
        null,
        "warn",
      );
      const twiml = new twilio.twiml.VoiceResponse();

      const to = (formData.get("To") as string) || "";
      const from = (formData.get("From") as string) || "";

      // Try to lookup tracking config from seller's trackingNumbers
      const trackingNumbers =
        (seller as unknown as { trackingNumbers?: unknown[] })
          .trackingNumbers ?? [];
      type TrackingNumber = {
        phoneNumber?: string;
        overflowNumber?: string;
        missedCallTextBack?: boolean;
        missedCallTextMessage?: string;
        reconnectCaller?: boolean;
      };
      const trackingConfig = (trackingNumbers as TrackingNumber[]).find(
        (num) => num.phoneNumber === to,
      );
      const overflowNumber = trackingConfig?.overflowNumber || "";
      const missedCallTextBack = trackingConfig?.missedCallTextBack || false;
      const missedCallTextMessage = trackingConfig?.missedCallTextMessage || "";

      if (overflowNumber) {
        addOverflowToTwiml(twiml, {
          overflowNumber,
          sellerId: seller._id as string,
          callSid: childCallSid || originalCallSid || "",
          from,
          passCallerId: true,
          recordCall: false,
        });
        debugLog("No DB call found — using overflow fallback", {
          overflowNumber,
        });
      } else {
        twiml.say("All of our representatives are currently unavailable.");
        addVoicemailToTwiml(twiml, {
          sellerId: seller._id as string,
          callSid: childCallSid || originalCallSid || "",
        });
        debugLog("No DB call found — playing voicemail fallback");
      }

      if (missedCallTextBack && missedCallTextMessage) {
        sendMissedCallTextBack(
          from,
          missedCallTextMessage,
          childCallSid || originalCallSid || "",
        );
      }

      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Check if the call was unanswered or explicitly rejected by Twilio
    if (["no-answer", "busy", "failed", "canceled"].includes(callStatus)) {
      //(`Call ${parentCallSid || childCallSid} was not accepted. Retrying next buyer...`);

      // Update the call status to "no-answer"
      call.status = "no-answer";
      await call.save();

      // Determine the next forwarding step based on the forwardingType
      const { forwardingType, forwardingNumbers, leadBuyers, industry } = call;

      const twiml = new twilio.twiml.VoiceResponse();

      if (forwardingType === "direct") {
        const buyers = await Buyer.find({
          _id: { $in: seller.buyers },
          "leadPreferences.industries": industry,
        });

        if (buyers.length === 0) {
          console.error(`No buyers available for industry: ${industry}`);
          const twiml = buildUnavailableTwiml(
            "Our agents are currently busy. Please try again later or leave a voicemail after the beep.",
            childCallSid || parentCallSid || "",
          );
          return new NextResponse(twiml.toString(), {
            status: 200,
            headers: { "Content-Type": "text/xml" },
          });
        }

        // Use atomic round-robin for no-answer retry (Issue #1 & #2 fix)
        try {
          const {
            buyer: nextBuyer,
            currentIndex,
            nextIndex,
          } = await getNextRoundRobinBuyerAtomic(
            seller,
            industry,
            { units: 1, seconds: 60 }, // Default rate for retry
          );

          debugLog("No-answer retry assigned to buyer", {
            originalCallSid: parentCallSid,
            nextBuyerId: nextBuyer._id,
            nextBuyerPhone: nextBuyer.phone,
            industry,
            currentIndex,
            nextIndex,
          });

          // Forward the call to the next buyer
          twiml.dial(
            {
              callerId: call.from,
              timeout: 20, // 20 seconds before retrying
              action: `https://${env.NEXTAUTH_URL}/api/calls/twilio/no-answer?sellerId=${sellerId}&callSid=${parentCallSid}`, // Webhook for no-answer handling
            },
            nextBuyer.phone,
          );

          // Create a new call record for the next buyer
          const newCall = new Call({
            callSid: `${parentCallSid || childCallSid}-${nextIndex}`, // New CallSid for this forwarded leg (using nextIndex)
            userId: seller._id,
            buyerId: nextBuyer._id.toString(),
            from: call.from,
            to: nextBuyer.phone,
            status: "forwarded", // New call is forwarded to the next buyer
            callRecorded: call.callRecorded,
            forwardingType,
            forwardingNumbers,
            leadBuyers,
            industry,
          });
          await newCall.save();
        } catch (error) {
          debugLog(
            "Error during no-answer retry with atomic RR",
            {
              error: error instanceof Error ? error.message : "Unknown error",
              originalCallSid: parentCallSid,
              industry,
            },
            "error",
          );
          twiml.say(
            "All buyers are currently unavailable. Please try again later.",
          );
        }
      } else if (
        forwardingType === "single_multiple" &&
        forwardingNumbers?.length
      ) {
        // Forward to multiple numbers sequentially
        forwardingNumbers.forEach((num: string | undefined, index: number) => {
          twiml.dial(
            {
              callerId: call.from,
              timeout: 20, // 20 seconds before retrying
              action: `https://${env.NEXTAUTH_URL}/api/calls/twilio/no-answer?sellerId=${sellerId}&callSid=${parentCallSid}`, // Webhook for no-answer handling
            },
            num,
          );
          if (index < forwardingNumbers.length - 1) {
            twiml.pause({ length: 1 }); // Add a small pause between forwarding attempts
          }
        });
      } else if (forwardingType === "specific_lead" && leadBuyers?.length) {
        // Forward to specific lead buyers sequentially
        (leadBuyers as Array<string | { phone?: string }>).forEach(
          (buyer: string | { phone?: string }, index: number) => {
            const buyerPhone = typeof buyer === "string" ? buyer : buyer?.phone;
            if (!buyerPhone) return;
            twiml.dial(
              {
                callerId: call.from,
                timeout: 20, // 20 seconds before retrying
                action: `https://${env.NEXTAUTH_URL}/api/calls/twilio/no-answer?sellerId=${sellerId}&callSid=${parentCallSid}`, // Webhook for no-answer handling
              },
              buyerPhone,
            );
            if (
              index <
              (leadBuyers as Array<string | { phone?: string }>).length - 1
            ) {
              twiml.pause({ length: 1 }); // Add a small pause between forwarding attempts
            }
          },
        );
      } else {
        // No forwarding rules configured
        twiml.say(
          "Our agents are currently busy. Please try again later or leave a voicemail after the beep.",
        );
        addVoicemailToTwiml(twiml, {
          sellerId: seller._id as string,
          callSid: childCallSid || parentCallSid || "",
          message:
            "Our agents are currently busy. Please try again later or leave a voicemail after the beep.",
        });
      }

      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    // If the call was answered, update the call status and recording details
    const recordingUrl = formData.get("RecordingUrl") as string;
    const callDuration = formData.get("CallDuration") as string;
    const answeredBy = (formData.get("AnsweredBy") as string) || "Unknown";

    const updatedCall = await Call.findOneAndUpdate(
      { callSid: call.callSid },
      {
        status: callStatus,
        recordingUrl: recordingUrl || "No Record",
        callDuration: callDuration ? parseInt(callDuration, 10) : null,
        answeredBy: answeredBy || "N/A",
      },
      { new: true },
    );

    return new NextResponse(JSON.stringify({ success: true, updatedCall }), {
      status: 200,
    });
  } catch (error) {
    console.error("No-answer handling failed:", error);

    // Safely handle the 'error' object of type 'unknown'
    const errorMessage =
      error instanceof Error ? error.message : "No-answer handling failed";

    // Log the full error for debugging
    console.error("Full error details:", error);

    const twiml = buildUnavailableTwiml(
      process.env.NODE_ENV === "development"
        ? `Our agents are currently busy. Please try again later or leave a voicemail after the beep. (${errorMessage})`
        : "Our agents are currently busy. Please try again later or leave a voicemail after the beep.",
      "",
    );
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
