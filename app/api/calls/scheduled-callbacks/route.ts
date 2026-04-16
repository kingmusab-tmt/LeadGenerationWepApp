import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import ScheduledCallback from "@/models/scheduledCallback";
import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

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

    if (session.user.role !== "seller" && session.user.role !== "admin") {
      return forbidden("Seller or admin access required");
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status") || "pending";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (Number.isNaN(page) || Number.isNaN(limit) || page < 1 || limit < 1) {
      return badRequest("page and limit must be positive integers");
    }

    const query: Record<string, unknown> = { sellerId: session.user.id };
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

    return NextResponse.json({
      success: true,
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

    if (session.user.role !== "seller" && session.user.role !== "admin") {
      return forbidden("Seller or admin access required");
    }

    const { callbackId, action, notes } = await req.json();

    if (!callbackId || !action) {
      return badRequest("callbackId and action are required");
    }

    const callback = await ScheduledCallback.findOne({
      _id: callbackId,
      sellerId: session.user.id,
    });

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

    return NextResponse.json({
      success: true,
      callback,
    });
  } catch (error) {
    console.error("Error updating callback:", error);
    return internalError("Failed to update callback");
  }
}
