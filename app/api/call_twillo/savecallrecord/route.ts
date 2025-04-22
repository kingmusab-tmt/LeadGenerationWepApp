import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import Call from "@/models/call";

export async function POST(req: NextRequest) {
  try {
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
        { status: 400 }
      );
    }

    // Find the call record by CallSid and update it
    const updatedCall = await Call.findOneAndUpdate(
      { callSid },
      {
        callStatus,
        answeredBy: answeredBy || "N/A",
        recordingUrl: recordingUrl || "No Record",
        callDuration: callDuration ? parseInt(callDuration, 10) : null,
      },
      { new: true } // Return the updated document
    );

    if (!updatedCall) {
      return new NextResponse(
        JSON.stringify({ error: "Call record not found" }),
        { status: 404 }
      );
    }

    return new NextResponse(JSON.stringify({ success: true, updatedCall }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error updating call record:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to update call record" }),
      { status: 500 }
    );
  }
}
