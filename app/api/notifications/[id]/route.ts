import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/userModel";
import { Notification } from "@/models/notificationModel";
import {
  badRequest,
  internalError,
  notFound,
  successResponse,
  unauthorized,
} from "@/lib/api/error-handler";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    if (!id) {
      return badRequest("Notification id is required");
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: user._id },
      { $set: { status: "read" } },
      { new: true },
    ).lean();

    if (!notification) {
      return notFound("Notification");
    }

    return successResponse(notification);
  } catch (error) {
    console.error("Error updating notification:", error);
    return internalError("Failed to update notification");
  }
}
