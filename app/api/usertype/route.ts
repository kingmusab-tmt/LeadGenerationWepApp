import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/connectdb";
import { authOptions } from "@/auth";
import { User } from "@/models/user";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    const { role } = await req.json();
    if (
      role !== "seller" &&
      role !== "buyer" &&
      role !== "business-admin" &&
      role !== "staff"
    ) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    }

    const result = await User.findByIdAndUpdate(
      session.user.id,
      { role },
      { new: true }
    );

    if (result) {
      return NextResponse.json(
        { message: "Role updated successfully" },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { message: "User not found or role not updated" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
