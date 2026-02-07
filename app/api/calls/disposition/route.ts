import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import Call from "@/models/call";
import { invalidateCallCache } from "@/lib/cachedSession";
import { NextRequest, NextResponse } from "next/server";

/**
 * Call Disposition API
 * PATCH: Set disposition code and notes on a call (buyer action)
 */
export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { callId, disposition, dispositionNotes } = await req.json();

    if (!callId || !disposition) {
      return NextResponse.json(
        { error: "callId and disposition are required" },
        { status: 400 },
      );
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
      return NextResponse.json(
        {
          error: `Invalid disposition. Must be one of: ${validDispositions.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Buyer can only update their own calls
    const call = await Call.findOne({
      _id: callId,
      buyerId: session.user.id,
    });

    if (!call) {
      return NextResponse.json(
        { error: "Call not found or not authorized" },
        { status: 404 },
      );
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
    return NextResponse.json(
      { error: "Failed to update disposition" },
      { status: 500 },
    );
  }
}
