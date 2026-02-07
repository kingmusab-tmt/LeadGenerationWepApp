import dbConnect from "@/lib/connectdb";
import Call from "@/models/call";
import { processCallAIAnalysis } from "@/lib/callAIAnalysis";
import { NextRequest, NextResponse } from "next/server";

/**
 * Twilio Transcription Callback Handler
 * Called by Twilio when a call transcription is ready.
 * Stores the transcription and triggers AI analysis.
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const formData = await req.formData();
    const transcriptionText = formData.get("TranscriptionText") as string;
    const callSid = formData.get("CallSid") as string;
    const transcriptionSid = formData.get("TranscriptionSid") as string;
    const transcriptionStatus = formData.get("TranscriptionStatus") as string;

    if (!callSid) {
      return NextResponse.json(
        { error: "CallSid is required" },
        { status: 400 },
      );
    }

    if (transcriptionStatus !== "completed" || !transcriptionText) {
      // Transcription failed or is empty, just log
      console.log(
        `Transcription ${transcriptionSid} for call ${callSid}: status=${transcriptionStatus}`,
      );
      return NextResponse.json({ success: true, status: "skipped" });
    }

    // Update call record with transcription
    const call = await Call.findOneAndUpdate(
      { callSid },
      { transcription: transcriptionText },
      { new: true },
    );

    if (!call) {
      console.warn(`Call not found for transcription: ${callSid}`);
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    // Trigger AI analysis if transcription was saved
    processCallAIAnalysis(callSid, {
      transcriptionEnabled: true,
      aiSummaryEnabled: true,
      industry: call.industry,
    }).catch((err) => {
      console.error("AI analysis error for transcription callback:", err);
    });

    return NextResponse.json({
      success: true,
      callSid,
      transcriptionSid,
    });
  } catch (error) {
    console.error("Error handling transcription callback:", error);
    return NextResponse.json(
      { error: "Failed to process transcription" },
      { status: 500 },
    );
  }
}
