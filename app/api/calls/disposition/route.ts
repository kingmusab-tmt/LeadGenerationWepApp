import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import Call from "@/models/call";
import { invalidateCallCache } from "@/lib/cachedSession";
import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

/**
 * Call Disposition API
 * PATCH: Set disposition code and notes on a call (buyer action)
 */
export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    if (session.user.role !== "buyer") {
      return forbidden("Buyer access required");
    }

    const { callId, disposition, dispositionNotes } = await req.json();

    if (!callId || !disposition) {
      return badRequest("callId and disposition are required");
    }

    const validDispositions = [
      "qualified_lead",
      "not_interested",
      "wrong_number",
      "callback_requested",
      "sold",
      "voicemail",
      "spam",
    ];

    if (!validDispositions.includes(disposition)) {
      return badRequest(
        `Invalid disposition. Must be one of: ${validDispositions.join(", ")}`,
      );
    }

    // Buyer can only update their own calls
    const call = await Call.findOne({
      _id: callId,
      buyerId: session.user.id,
    });

    if (!call) {
      return notFound("Call");
    }

    call.disposition = disposition;
    if (dispositionNotes !== undefined) {
      call.dispositionNotes = dispositionNotes;
    }
    await call.save();

    // Invalidate cache
    invalidateCallCache(session.user.id);

    return NextResponse.json({
      success: true,
      call: {
        _id: call._id,
        disposition: call.disposition,
        dispositionNotes: call.dispositionNotes,
      },
    });
  } catch (error) {
    console.error("Error updating disposition:", error);
    return internalError("Failed to update disposition");
  }
}
