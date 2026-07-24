import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { User } from "@/models";
import { NextRequest } from "next/server";
import {
  badRequest,
  internalError,
  notFound,
  successResponse,
  unauthorized,
} from "@/lib/api/error-handler";
import { requireCsrf } from "@/lib/security/requireCsrf";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";

type TrackingNumberEntry = {
  phoneNumber?: string;
  dncEnabled?: boolean;
  dncList?: string[];
};

const MAX_DNC_ENTRIES = 500;

/**
 * DNC (Do-Not-Call) List Management API
 * GET: Get DNC list for a tracking number
 * POST: Add number(s) to DNC list
 * DELETE: Remove a number from DNC list
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    const phoneNumber = req.nextUrl.searchParams.get("phoneNumber");
    if (!phoneNumber) {
      return badRequest("phoneNumber query parameter is required");
    }

    const seller = await User.findById(session.user.id);
    if (!seller) {
      return notFound("User");
    }

    const trackingNumbers =
      (seller.trackingNumbers as TrackingNumberEntry[] | undefined) || [];
    const tn = trackingNumbers.find((n) => n.phoneNumber === phoneNumber);
    if (!tn) {
      return notFound("Tracking number");
    }

    return successResponse({
      dncEnabled: tn.dncEnabled || false,
      dncList: tn.dncList || [],
      count: (tn.dncList || []).length,
    });
  } catch (error) {
    console.error("Error fetching DNC list:", error);
    return internalError("Failed to fetch DNC list");
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    const csrfError = requireCsrf(req, session.user.email);
    if (csrfError) return csrfError;

    const rateLimited = await checkSimpleRateLimit(req, {
      scope: "dnc-post",
      limit: 30,
      windowMs: 5 * 60 * 1000,
      actorId: session.user.id,
    });
    if (rateLimited) return rateLimited;

    const { phoneNumber, numbers } = await req.json();

    if (!phoneNumber || !numbers || !Array.isArray(numbers)) {
      return badRequest("phoneNumber and numbers[] are required");
    }

    const seller = await User.findById(session.user.id);
    if (!seller) {
      return notFound("User");
    }

    const trackingNumbers =
      (seller.trackingNumbers as TrackingNumberEntry[] | undefined) || [];
    const tn = trackingNumbers.find((n) => n.phoneNumber === phoneNumber);
    if (!tn) {
      return notFound("Tracking number");
    }

    const existingList = new Set(tn.dncList || []);
    const cleaned = Array.from(
      new Set(
        numbers
          .map((n: string) => n.replace(/[^+\d]/g, "").trim())
          .filter((n: string) => n.length >= 10),
      ),
    );

    if (existingList.size + cleaned.length > MAX_DNC_ENTRIES) {
      return badRequest(
        `DNC list cannot exceed ${MAX_DNC_ENTRIES} numbers (currently ${existingList.size}).`,
      );
    }

    // Atomic $addToSet instead of read-modify-write on the whole seller
    // document — a plain seller.save() here would clobber any concurrent
    // edit (e.g. updateForwarding/removeNumber) to a different tracking
    // number on the same User document.
    const updated = await User.findOneAndUpdate(
      { _id: session.user.id, "trackingNumbers.phoneNumber": phoneNumber },
      {
        $addToSet: {
          "trackingNumbers.$.dncList": { $each: cleaned },
        },
      },
      { new: true },
    ).select("trackingNumbers");

    if (!updated) {
      return notFound("Tracking number");
    }

    const updatedTn = (
      updated.trackingNumbers as unknown as TrackingNumberEntry[]
    ).find((n) => n.phoneNumber === phoneNumber);
    const total = updatedTn?.dncList?.length || 0;
    const added = cleaned.filter((n) => !existingList.has(n)).length;

    return successResponse({ added, total });
  } catch (error) {
    console.error("Error adding to DNC list:", error);
    return internalError("Failed to add to DNC list");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    const csrfError = requireCsrf(req, session.user.email);
    if (csrfError) return csrfError;

    const rateLimited = await checkSimpleRateLimit(req, {
      scope: "dnc-delete",
      limit: 30,
      windowMs: 5 * 60 * 1000,
      actorId: session.user.id,
    });
    if (rateLimited) return rateLimited;

    const { phoneNumber, number } = await req.json();

    if (!phoneNumber || !number) {
      return badRequest("phoneNumber and number are required");
    }

    const seller = await User.findById(session.user.id);
    if (!seller) {
      return notFound("User");
    }

    const trackingNumbers =
      (seller.trackingNumbers as TrackingNumberEntry[] | undefined) || [];
    const tn = trackingNumbers.find((n) => n.phoneNumber === phoneNumber);
    if (!tn) {
      return notFound("Tracking number");
    }

    const before = (tn.dncList || []).length;

    const updated = await User.findOneAndUpdate(
      { _id: session.user.id, "trackingNumbers.phoneNumber": phoneNumber },
      { $pull: { "trackingNumbers.$.dncList": number } },
      { new: true },
    ).select("trackingNumbers");

    if (!updated) {
      return notFound("Tracking number");
    }

    const updatedTn = (
      updated.trackingNumbers as unknown as TrackingNumberEntry[]
    ).find((n) => n.phoneNumber === phoneNumber);
    const total = updatedTn?.dncList?.length || 0;
    const removed = before - total;

    return successResponse({ removed, total });
  } catch (error) {
    console.error("Error removing from DNC list:", error);
    return internalError("Failed to remove from DNC list");
  }
}
