import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import ScheduledCallback from "@/models/scheduledCallback";
import { NextRequest, NextResponse } from "next/server";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status") || "pending";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const query: Record<string, any> = { sellerId: session.user.id };
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
    return NextResponse.json(
      { error: "Failed to fetch callbacks" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { callbackId, action, notes } = await req.json();

    if (!callbackId || !action) {
      return NextResponse.json(
        { error: "callbackId and action are required" },
        { status: 400 },
      );
    }

    const callback = await ScheduledCallback.findOne({
      _id: callbackId,
      sellerId: session.user.id,
    });

    if (!callback) {
      return NextResponse.json(
        { error: "Callback not found" },
        { status: 404 },
      );
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
      return NextResponse.json(
        { error: "Invalid action. Use 'complete' or 'cancel'" },
        { status: 400 },
      );
    }

    await callback.save();

    return NextResponse.json({
      success: true,
      callback,
    });
  } catch (error) {
    console.error("Error updating callback:", error);
    return NextResponse.json(
      { error: "Failed to update callback" },
      { status: 500 },
    );
  }
}
