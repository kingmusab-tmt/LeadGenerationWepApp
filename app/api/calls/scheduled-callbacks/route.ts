import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import ScheduledCallback from "@/models/scheduledCallback";
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

import { isSellerRole } from "@/lib/roles";
/**
 * Scheduled Callbacks API
 * GET: List scheduled callbacks for the authenticated seller
 * PATCH: Update a callback status (complete/cancel)
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    if (!isSellerRole(session.user.role) && session.user.role !== "admin") {
      return forbidden("Seller or admin access required");
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status") || "pending";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const requestedSellerId = searchParams.get("sellerId");

    if (Number.isNaN(page) || Number.isNaN(limit) || page < 1 || limit < 1) {
      return badRequest("page and limit must be positive integers");
    }

    // Only admins may look up another seller's callbacks — the role check
    // above previously let admins pass, but the query below always scoped to
    // the admin's own user ID, so admin access to this endpoint silently
    // returned nothing (an admin's own ID never matches a seller's records).
    const targetSellerId =
      session.user.role === "admin" && requestedSellerId
        ? requestedSellerId
        : session.user.id;

    const query: Record<string, unknown> = { sellerId: targetSellerId };
    if (status !== "all") {
      query.status = status;
    }

    const [callbacks, total] = await Promise.all([
      ScheduledCallback.find(query)
        .sort({ scheduledFor: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ScheduledCallback.countDocuments(query),
    ]);

    return successResponse({
      callbacks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching scheduled callbacks:", error);
    return internalError("Failed to fetch callbacks");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    if (!isSellerRole(session.user.role) && session.user.role !== "admin") {
      return forbidden("Seller or admin access required");
    }

    const csrfError = requireCsrf(req, session.user.email);
    if (csrfError) return csrfError;

    const { callbackId, action, notes } = await req.json();

    if (!callbackId || !action) {
      return badRequest("callbackId and action are required");
    }

    // A callbackId is already a specific record, so admins may act on any
    // seller's callback by ID; sellers remain scoped to their own.
    const callbackQuery: Record<string, unknown> = { _id: callbackId };
    if (session.user.role !== "admin") {
      callbackQuery.sellerId = session.user.id;
    }

    const callback = await ScheduledCallback.findOne(callbackQuery);

    if (!callback) {
      return notFound("Callback");
    }

    if (action === "complete") {
      callback.status = "completed";
      callback.completedAt = new Date();
      callback.completedBy = session.user.id;
      if (notes) callback.notes = notes;
    } else if (action === "cancel") {
      callback.status = "cancelled";
      if (notes) callback.notes = notes;
    } else {
      return badRequest("Invalid action. Use 'complete' or 'cancel'");
    }

    await callback.save();

    return successResponse({ callback });
  } catch (error) {
    console.error("Error updating callback:", error);
    return internalError("Failed to update callback");
  }
}
