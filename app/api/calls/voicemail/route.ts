import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import dbConnect from "@/lib/connectdb";
import Call from "@/models/call";
import { debugLog } from "@/utils/callHandlers";
import { callSecurityMiddleware } from "@/lib/security/callSecurity";
import { dispatchCallWebhook } from "@/lib/integrations/callWebhookDispatcher";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  badRequest,
  internalError,
  notFound,
  successResponse,
  unauthorized,
} from "@/lib/api/error-handler";

function twimlResponse(twiml: InstanceType<typeof twilio.twiml.VoiceResponse>) {
  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

/**
 * POST /api/calls/voicemail
 *
 * Twilio hits this from two different places with two different response
 * requirements:
 * - As the `action` on a <Record> verb (addVoicemailToTwiml): the call is
 *   still live, so this must return TwiML to tell Twilio what to do next.
 *   Twilio does not include `RecordingStatus` on this request.
 * - As the async `recordingStatusCallback`: fire-and-forget, call has
 *   already ended, response body is ignored. Twilio always includes
 *   `RecordingStatus` here.
 * We use the presence of `RecordingStatus` to tell the two apart.
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
    const recordingStatus = formData.get("RecordingStatus") as string | null;
    const transcriptionText = formData.get("TranscriptionText") as string;

    const isAsyncStatusCallback = recordingStatus !== null;

    debugLog("Voicemail recording callback", {
      callSid,
      recordingUrl,
      recordingDuration,
      recordingStatus,
      isAsyncStatusCallback,
      hasTranscription: !!transcriptionText,
    });

    if (!callSid) {
      if (isAsyncStatusCallback) return badRequest("Missing CallSid");
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say("Thank you for your message. Goodbye.");
      twiml.hangup();
      return twimlResponse(twiml);
    }

    // The async recordingStatusCallback fires once per recording and is the
    // only request guaranteed to report a terminal status — skip persisting
    // on anything other than "completed" so partial/failed recordings don't
    // overwrite a good one.
    if (isAsyncStatusCallback && recordingStatus !== "completed") {
      debugLog("Voicemail recording not completed", { recordingStatus });
      return NextResponse.json({ status: "ignored" }, { status: 200 });
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
      if (isAsyncStatusCallback) return notFound("Call record");
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say("Thank you for your message. Goodbye.");
      twiml.hangup();
      return twimlResponse(twiml);
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

    if (isAsyncStatusCallback) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say("Thank you for your message. Goodbye.");
    twiml.hangup();
    return twimlResponse(twiml);
  } catch (error) {
    debugLog("Voicemail callback failed", { error }, "error");
    return internalError("Voicemail processing failed");
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
      return unauthorized("Authentication required");
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const listenedFilter = searchParams.get("listened"); // "true", "false", or null for all

    if (Number.isNaN(page) || Number.isNaN(limit) || page < 1 || limit < 1) {
      return badRequest("page and limit must be positive integers");
    }

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

    return successResponse({
      voicemails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    debugLog("Voicemail list failed", { error }, "error");
    return internalError("Failed to fetch voicemails");
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
      return unauthorized("Authentication required");
    }

    await dbConnect();

    const body = await req.json();
    const { callId } = body;

    if (!callId) {
      return badRequest("Missing callId");
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
      return notFound("Voicemail");
    }

    return successResponse({ call: updatedCall });
  } catch (error) {
    debugLog("Voicemail mark listened failed", { error }, "error");
    return internalError("Failed to update voicemail");
  }
}
