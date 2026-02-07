import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import Call from "@/models/call";
import { debugLog } from "@/utils/callHandlers";
import { callSecurityMiddleware } from "@/lib/security/callSecurity";
import { dispatchCallWebhook } from "@/lib/integrations/callWebhookDispatcher";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

/**
 * POST /api/calls/voicemail
 * Twilio recording status callback — updates call record with voicemail data
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
    const callSid = formData.get("CallSid") as string;
    const recordingUrl = formData.get("RecordingUrl") as string;
    const recordingDuration = formData.get("RecordingDuration") as string;
    const recordingStatus = formData.get("RecordingStatus") as string;
    const transcriptionText = formData.get("TranscriptionText") as string;

    debugLog("Voicemail recording callback", {
      callSid,
      recordingUrl,
      recordingDuration,
      recordingStatus,
      hasTranscription: !!transcriptionText,
    });

    if (!callSid) {
      return new NextResponse(JSON.stringify({ error: "Missing CallSid" }), {
        status: 400,
      });
    }

    if (recordingStatus !== "completed") {
      debugLog("Voicemail recording not completed", { recordingStatus });
      return new NextResponse(JSON.stringify({ status: "ignored" }), {
        status: 200,
      });
    }

    // Update the call record with voicemail data
    const updatedCall = await Call.findOneAndUpdate(
      { callSid },
      {
        status: "voicemail",
        voicemail: {
          recordingUrl: recordingUrl || "",
          duration: recordingDuration ? parseInt(recordingDuration, 10) : 0,
          transcription: transcriptionText || undefined,
          listened: false,
        },
      },
      { new: true },
    );

    if (!updatedCall) {
      debugLog("Call record not found for voicemail", { callSid }, "warn");
      return new NextResponse(
        JSON.stringify({ error: "Call record not found" }),
        { status: 404 },
      );
    }

    debugLog("Voicemail saved successfully", {
      callId: updatedCall._id,
      duration: recordingDuration,
    });

    // Fire voicemail webhook (non-blocking)
    dispatchCallWebhook(updatedCall.userId, "callVoicemail", {
      callSid,
      from: updatedCall.from,
      to: updatedCall.to,
      status: "voicemail",
      industry: updatedCall.industry,
      voicemailDuration: recordingDuration
        ? parseInt(recordingDuration, 10)
        : 0,
      recordingUrl: recordingUrl || "",
    });

    return new NextResponse(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    debugLog("Voicemail callback failed", { error }, "error");
    return new NextResponse(
      JSON.stringify({ error: "Voicemail processing failed" }),
      { status: 500 },
    );
  }
}

/**
 * GET /api/calls/voicemail
 * Get voicemail calls for the authenticated seller
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const listenedFilter = searchParams.get("listened"); // "true", "false", or null for all

    const query: Record<string, unknown> = {
      userId: session.user.id,
      status: "voicemail",
      voicemail: { $exists: true },
    };

    if (listenedFilter === "true") {
      query["voicemail.listened"] = true;
    } else if (listenedFilter === "false") {
      query["voicemail.listened"] = false;
    }

    const [voicemails, total] = await Promise.all([
      Call.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Call.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: voicemails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    debugLog("Voicemail list failed", { error }, "error");
    return new NextResponse(
      JSON.stringify({ error: "Failed to fetch voicemails" }),
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/calls/voicemail
 * Mark voicemail as listened
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    await dbConnect();

    const body = await req.json();
    const { callId } = body;

    if (!callId) {
      return new NextResponse(JSON.stringify({ error: "Missing callId" }), {
        status: 400,
      });
    }

    const updatedCall = await Call.findOneAndUpdate(
      { _id: callId, userId: session.user.id },
      {
        "voicemail.listened": true,
        "voicemail.listenedAt": new Date(),
      },
      { new: true },
    );

    if (!updatedCall) {
      return new NextResponse(
        JSON.stringify({ error: "Voicemail not found" }),
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: updatedCall });
  } catch (error) {
    debugLog("Voicemail mark listened failed", { error }, "error");
    return new NextResponse(
      JSON.stringify({ error: "Failed to update voicemail" }),
      { status: 500 },
    );
  }
}
