import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import Call from "@/models/call";
import { Buyer } from "@/models/leadbuyers";
import { invalidateCallCache } from "@/lib/cachedSession";
import { NextRequest } from "next/server";
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  successResponse,
  unauthorized,
} from "@/lib/api/error-handler";
import { requireCsrf } from "@/lib/security/requireCsrf";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";

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

    const csrfError = requireCsrf(req, session.user.email);
    if (csrfError) return csrfError;

    const rateLimited = await checkSimpleRateLimit(req, {
      scope: "call-disposition",
      limit: 60,
      windowMs: 10 * 60 * 1000,
      actorId: session.user.id,
    });
    if (rateLimited) return rateLimited;

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

    // `call.buyerId` references the Buyer collection, not the User collection,
    // so the buyer profile must be resolved by email first — comparing
    // directly against session.user.id (a User _id) would never match.
    const buyerProfile = await Buyer.findOne({ email: session.user.email })
      .select("_id")
      .lean();
    if (!buyerProfile) {
      return notFound("Buyer profile");
    }

    // Buyer can only update their own calls
    const call = await Call.findOne({
      _id: callId,
      buyerId: buyerProfile._id,
    });

    if (!call) {
      return notFound("Call");
    }

    // "qualified_lead"/"sold" feed the Buyer Performance conversion-rate
    // calculation (qualifiedLeads + soldLeads) / answeredCalls, where
    // answeredCalls only counts status === "completed" — allowing these on
    // a call that never actually connected (no-answer, insufficient
    // balance, etc.) let conversionRate exceed 100%.
    if (
      (disposition === "qualified_lead" || disposition === "sold") &&
      call.status !== "completed"
    ) {
      return badRequest(
        "Only calls that were answered (completed) can be marked qualified or sold.",
      );
    }

    call.disposition = disposition;
    if (dispositionNotes !== undefined) {
      call.dispositionNotes = dispositionNotes;
    }
    await call.save();

    // Invalidate cache
    invalidateCallCache(session.user.id);

    return successResponse({
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
