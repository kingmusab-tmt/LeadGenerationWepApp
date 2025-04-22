import {
  getAllNotifications,
  updateNotification,
  deleteNotification,
  saveNotification,
} from "@/models/notifications";
import { NextResponse, NextRequest } from "next/server";

export async function GET() {
  try {
    const notifications = await getAllNotifications();
    return NextResponse.json({
      success: true,
      data: notifications,
      status: 200,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Failed to fetch notifications",
      status: 500,
    });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { message, recipient } = body;

  try {
    await saveNotification(message, recipient);
    return NextResponse.json({
      success: true,
      status: 200,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create Notification",
        details: error,
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json();

  const { message, recipient } = body;

  try {
    const { searchParams } = new URL(req.url);
    const _id = searchParams.get("id");

    await updateNotification(_id as string, message, recipient);
    return NextResponse.json({
      success: true,
      message: "Notification updated successfully",
      status: 200,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Failed to update notification",
      status: 500,
    });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const _id = searchParams.get("id");

    if (!_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Notification ID is required as a query parameter.",
        },
        { status: 400 }
      );
    }

    await deleteNotification(_id as string);
    return NextResponse.json({
      success: true,
      message: "Notification deleted successfully",
      status: 200,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Failed to delete notification",
      status: 500,
    });
  }
}
