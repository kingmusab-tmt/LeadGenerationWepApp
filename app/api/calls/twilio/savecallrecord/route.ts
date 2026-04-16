import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import Call from "@/models/call";
import { checkAndIncrementUsage } from "@/lib/subscriptionLimitsService";
import { callSecurityMiddleware } from "@/lib/security/callSecurity";

export async function POST(req: NextRequest) {
  try {
    const securityResponse = await callSecurityMiddleware(req, {
      rateLimit: true,
      validateWebhook: true,
    });
    if (securityResponse) return securityResponse;

    await dbConnect();

    // Parse the form data sent by Twilio
    const formData = await req.formData();
    const callSid = formData.get("CallSid") as string;
    const recordingUrl = formData.get("RecordingUrl") as string;
    const callDuration = formData.get("CallDuration") as string; // Twilio sends call duration in seconds
    const callStatus = formData.get("CallStatus") as string;
    const answeredBy = (formData.get("AnsweredBy") as string) || "Unknown"; // May not always be provided

    if (!callSid || !callStatus) {
      return new NextResponse(
        JSON.stringify({
          error: "CallSid and CallStatus are required",
        }),
        { status: 400 },
      );
    }

    // Find the call record first to get the userId
    const existingCall = await Call.findOne({ callSid });
    if (!existingCall) {
      return new NextResponse(
        JSON.stringify({ error: "Call record not found" }),
        { status: 404 },
      );
    }

    const durationSeconds = callDuration ? parseInt(callDuration, 10) : 0;
    const normalizedRecordingUrl = recordingUrl || "No Record";
    const normalizedAnsweredBy = answeredBy || "N/A";

    const isDuplicateDelivery =
      existingCall.callStatus === callStatus &&
      (existingCall.recordingUrl || "No Record") === normalizedRecordingUrl &&
      (existingCall.answeredBy || "N/A") === normalizedAnsweredBy &&
      (existingCall.callDuration || 0) === durationSeconds;

    if (isDuplicateDelivery) {
      return NextResponse.json({ success: true, updatedCall: existingCall });
    }

    // Update the call record
    const updatedCall = await Call.findOneAndUpdate(
      { callSid },
      {
        callStatus,
        answeredBy: normalizedAnsweredBy,
        recordingUrl: normalizedRecordingUrl,
        callDuration: durationSeconds || null,
      },
      { new: true }, // Return the updated document
    );

    // Track call seconds usage against subscription limit
    if (existingCall.userId && durationSeconds > 0) {
      await checkAndIncrementUsage(
        existingCall.userId.toString(),
        "callSeconds",
        durationSeconds,
      );
    }

    return NextResponse.json({ success: true, updatedCall });
  } catch (error) {
    console.error("Error updating call record:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update call record" },
      { status: 500 },
    );
  }
}
