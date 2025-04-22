import { NextRequest, NextResponse } from "next/server";
import { getNotification } from "@/models/notifications";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const _id = searchParams.get("id");

    if (!_id) {
      return NextResponse.json(
        { success: false, error: "Notification ID is required", status: 400 },
        { status: 400 }
      );
    }
    const notification = await getNotification(_id as string);
    return NextResponse.json({
      success: true,
      data: notification,
      status: 200,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch notification", status: 500 },
      { status: 500 }
    );
  }
}
