import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/connectdb";
import { authOptions } from "@/auth";
import { User } from "@/models/userModel";
import { Notification } from "@/models/notificationModel";
import {
  badRequest,
  internalError,
  successResponse,
  unauthorized,
} from "@/lib/api/error-handler";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return unauthorized("Authentication required");
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email })
      .select("_id")
      .lean();

    if (!user?._id) {
      return unauthorized("Authentication required");
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limitParam = Number(searchParams.get("limit") || 50);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 200)
      : 50;

    if (status && status !== "read" && status !== "unread") {
      return badRequest("status must be one of: read, unread");
    }

    const filter: { userId: unknown; status?: "read" | "unread" } = {
      userId: user._id,
    };

    if (status === "read" || status === "unread") {
      filter.status = status;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const unreadCount = await Notification.countDocuments({
      userId: user._id,
      status: "unread",
    });

    return successResponse({ notifications, unreadCount });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return internalError("Failed to fetch notifications");
  }
}

export async function PATCH() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return unauthorized("Authentication required");
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email })
      .select("_id")
      .lean();

    if (!user?._id) {
      return unauthorized("Authentication required");
    }

    const result = await Notification.updateMany(
      { userId: user._id, status: "unread" },
      { $set: { status: "read" } },
    );

    return successResponse({ updatedCount: result.modifiedCount });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return internalError("Failed to update notifications");
  }
}
