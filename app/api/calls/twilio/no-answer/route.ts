import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import dbConnect from "@/lib/connectdb";
import Call from "@/models/call";
import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";
import { getNextRoundRobinBuyerAtomic, debugLog } from "@/utils/callHandlers";
import { callSecurityMiddleware } from "@/lib/security/callSecurity";
import { env } from "@/lib/env";

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
    const callSid = formData.get("CallSid") as string; // New CallSid for this forwarded leg
    const callStatus = formData.get("CallStatus") as string; // Call status (e.g., "no-answer")

    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const sellerId = searchParams.get("sellerId");

    if (!callSid || !callStatus || !sellerId) {
      console.error("Missing required parameters");
      return new NextResponse(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400 },
      );
    }

    // Find the seller associated with the call
    const seller = await User.findOne({ sellerId });

    if (!seller) {
      console.error(`Seller not found for sellerId: ${sellerId}`);
      return new NextResponse(JSON.stringify({ error: "Seller not found" }), {
        status: 404,
      });
    }

    // Find the call record by CallSid
    const call = await Call.findOne({ callSid });

    if (!call) {
      console.error(`Call record not found for CallSid: ${callSid}`);
      return new NextResponse(
        JSON.stringify({ error: "Call record not found" }),
        {
          status: 404,
        },
      );
    }

    // Check if the call was unanswered
    if (callStatus === "no-answer") {
      //(`Call ${callSid} was unanswered. Retrying next buyer...`);

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
          return new NextResponse(
            JSON.stringify({
              error: `No buyers available for industry: ${industry}`,
            }),
            { status: 404 },
          );
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
            originalCallSid: callSid,
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
              action: `https://${env.NEXTAUTH_URL}/api/call_twillo/no-answer?sellerId=${sellerId}&callSid=${callSid}`, // Webhook for no-answer handling
            },
            nextBuyer.phone,
          );

          // Create a new call record for the next buyer
          const newCall = new Call({
            callSid: `${callSid}-${nextIndex}`, // New CallSid for this forwarded leg (using nextIndex)
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
              originalCallSid: callSid,
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
              action: `https://${env.NEXTAUTH_URL}/api/calls/twilio/no-answer?sellerId=${sellerId}&callSid=${callSid}`, // Webhook for no-answer handling
            },
            num,
          );
          if (index < forwardingNumbers.length - 1) {
            twiml.pause({ length: 1 }); // Add a small pause between forwarding attempts
          }
        });
      } else if (forwardingType === "specific_lead" && leadBuyers?.length) {
        // Forward to specific lead buyers sequentially
        leadBuyers.forEach(
          (buyer: { phone: string | undefined }, index: number) => {
            twiml.dial(
              {
                callerId: call.from,
                timeout: 20, // 20 seconds before retrying
                action: `https://${env.NEXTAUTH_URL}/api/calls/twilio/no-answer?sellerId=${sellerId}&callSid=${callSid}`, // Webhook for no-answer handling
              },
              buyer.phone,
            );
            if (index < leadBuyers.length - 1) {
              twiml.pause({ length: 1 }); // Add a small pause between forwarding attempts
            }
          },
        );
      } else {
        // No forwarding rules configured
        twiml.say("No forwarding rules configured. Ending call.");
        //("No forwarding rules configured. Call ended.");
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
      { callSid },
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

    return new NextResponse(
      JSON.stringify({
        error: "No-answer handling failed",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      }),
      { status: 500 },
    );
  }
}
